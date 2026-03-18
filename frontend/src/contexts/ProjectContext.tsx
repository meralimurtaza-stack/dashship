/**
 * ProjectContext.tsx (v3 — with auth race condition fix)
 *
 * The foundational state layer for DashShip. Every other context
 * (Chat, DataSource, Dashboard) reads currentProject.id from here.
 *
 * Because we use Supabase Anonymous Auth, EVERY user — including
 * "just trying it out" users — has a real user.id. This means:
 *   - One code path: always read/write Supabase
 *   - No sessionStorage branching
 *   - No migrateToAuth() needed (Supabase handles conversion in-place)
 *
 * Fix in v3: createProject reads user from supabase.auth.getUser()
 * directly when React state hasn't caught up yet. This handles the
 * race condition where signInAnonymously() completes but React's
 * onAuthStateChange hasn't re-rendered with the new user yet.
 *
 * Spec references: §4.1 (Home page entry flows), §10 (State management rules),
 * §7 (Project hub), §9.1 (Entry flows E1-E8)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// ─── Types ────────────────────────────────────────────────────────

/** Matches the Supabase `projects` table schema */
export interface Project {
  id: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  user_id: string;
  // Denormalized counts — populated by the list query
  data_source_count?: number;
  dashboard_count?: number;
}

interface CreateProjectOptions {
  /** Explicit name. If omitted, auto-generated from prompt or "Untitled Project" */
  name?: string;
  /** The user's typed prompt from the Home page. Used for auto-naming. */
  fromPrompt?: string;
}

interface ProjectContextType {
  /** The project the user is currently working inside. null = on Home page. */
  currentProject: Project | null;
  /** All projects for sidebar listing. */
  projects: Project[];
  /** True during initial load or project fetch */
  loading: boolean;

  /** Create a brand new project. Returns the created project. */
  createProject: (opts?: CreateProjectOptions) => Promise<Project>;
  /** Switch to an existing project by ID. */
  selectProject: (id: string) => Promise<void>;
  /** Update project metadata (e.g. rename). */
  updateProject: (id: string, updates: Partial<Pick<Project, 'name' | 'status'>>) => Promise<void>;
  /** Refresh the projects list from Supabase. */
  loadProjects: () => Promise<void>;
  /** Clear currentProject (navigate back to Home). */
  clearProject: () => void;
}

// ─── Auto-naming helper ───────────────────────────────────────────
// Spec §10: "Project auto-named from the prompt or data source name"
// "Build me a customer retention dashboard..." → "Customer Retention Dashboard"

function autoNameFromPrompt(prompt: string): string {
  const cleaned = prompt
    .replace(/^(build|create|make|show|give)\s+(me\s+)?/i, '')
    .replace(/^(a|an|the)\s+/i, '')
    .replace(/\.{3,}$/, '')
    .trim();

  if (!cleaned) return 'Untitled Project';

  const words = cleaned.split(/\s+/).slice(0, 6);
  return words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ') || 'Untitled Project';
}

// ─── Context ──────────────────────────────────────────────────────

const ProjectContext = createContext<ProjectContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load projects ─────────────────────────────────────────────
  // Fetches all active projects for the current user, with
  // denormalized counts of data sources and dashboards.
  // Runs on mount and whenever user changes (sign in/out).

  const loadProjects = useCallback(async () => {
    if (!user) {
      // No user yet (page just loaded, or signed out)
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          data_sources(count),
          dashboards(count)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped: Project[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_id: row.user_id,
        data_source_count: row.data_sources?.[0]?.count ?? 0,
        dashboard_count: row.dashboards?.[0]?.count ?? 0,
      }));

      setProjects(mapped);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ── Create project ────────────────────────────────────────────
  // Spec §10: "Every home page action creates a NEW project"
  //
  // IMPORTANT: We read user from supabase.auth.getUser() directly
  // if React state doesn't have it yet. This handles the race
  // condition where signInAnonymously() just completed but
  // onAuthStateChange hasn't triggered a React re-render yet.

  const createProject = useCallback(
    async (opts?: CreateProjectOptions): Promise<Project> => {
      // Try React state first, fall back to direct Supabase check
      let userId = user?.id;
      if (!userId) {
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        userId = freshUser?.id;
      }
      if (!userId) {
        throw new Error(
          'Cannot create project without a user. Call signInAnonymously() first.'
        );
      }

      const now = new Date().toISOString();
      const projectId = crypto.randomUUID();

      const project: Project = {
        id: projectId,
        name: opts?.name
          || (opts?.fromPrompt ? autoNameFromPrompt(opts.fromPrompt) : 'Untitled Project'),
        status: 'active',
        created_at: now,
        updated_at: now,
        user_id: userId,
      };

      // Insert into Supabase
      const { error } = await supabase
        .from('projects')
        .insert({
          id: project.id,
          name: project.name,
          status: project.status,
          user_id: project.user_id,
        });

      if (error) {
        throw new Error(`Failed to create project: ${error.message}`);
      }

      // Update local state
      setProjects(prev => [project, ...prev]);
      setCurrentProject(project);

      return project;
    },
    [user]
  );

  // ── Select project ────────────────────────────────────────────
  // Called when user clicks a project in the sidebar.
  // Checks local cache first, then fetches from Supabase.

  const selectProject = useCallback(
    async (id: string) => {
      // Check local state first (avoids network round-trip)
      const local = projects.find(p => p.id === id);
      if (local) {
        setCurrentProject(local);
        return;
      }

      // Not in local state — fetch from Supabase
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        throw new Error(`Project ${id} not found`);
      }

      const project = data as Project;
      setCurrentProject(project);
      // Add to local cache
      setProjects(prev =>
        prev.some(p => p.id === id) ? prev : [project, ...prev]
      );
    },
    [projects, user]
  );

  // ── Update project ────────────────────────────────────────────

  const updateProject = useCallback(
    async (id: string, updates: Partial<Pick<Project, 'name' | 'status'>>) => {
      if (!user) return;

      const updatedAt = new Date().toISOString();

      const { error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: updatedAt })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw new Error(`Failed to update project: ${error.message}`);

      // Update local state
      setProjects(prev =>
        prev.map(p =>
          p.id === id ? { ...p, ...updates, updated_at: updatedAt } : p
        )
      );
      setCurrentProject(prev =>
        prev?.id === id ? { ...prev, ...updates, updated_at: updatedAt } : prev
      );
    },
    [user]
  );

  // ── Clear project ─────────────────────────────────────────────

  const clearProject = useCallback(() => {
    setCurrentProject(null);
  }, []);

  // ── Provide ───────────────────────────────────────────────────

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        loading,
        createProject,
        selectProject,
        updateProject,
        loadProjects,
        clearProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useProject(): ProjectContextType {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return ctx;
}
