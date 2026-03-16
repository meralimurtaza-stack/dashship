"""
Dashboard templates — proven layouts for common data shapes.
Captain picks the best template based on the data profile and user intent,
then maps the user's actual field names to the template slots.
"""

TEMPLATES = {
    "sales_performance": {
        "name": "Sales performance",
        "description": "Revenue tracking with trends, breakdowns, and top performers",
        "signals": ["revenue", "sales", "amount", "profit", "order", "transaction"],
        "requires": {
            "date_field": True,
            "amount_field": True,
            "category_field": True,
        },
        "layout": {
            "kpi_row": {
                "count": 4,
                "metrics": [
                    {"label": "Total {amount}", "agg": "sum", "slot": "amount_field"},
                    {"label": "Total orders", "agg": "count", "slot": "id_field"},
                    {"label": "Average {amount}", "agg": "avg", "slot": "amount_field"},
                    {"label": "{secondary_amount} margin", "agg": "avg", "slot": "secondary_amount_field", "optional": True},
                ]
            },
            "charts": [
                {
                    "title": "{amount} trend",
                    "type": "line",
                    "x": "date_field",
                    "y": "amount_field",
                    "agg": "sum",
                    "config": {"areaFill": True},
                    "size": {"w": 8, "h": 5},
                    "description": "How is revenue trending over time?"
                },
                {
                    "title": "{amount} by {category}",
                    "type": "bar",
                    "x": "category_field",
                    "y": "amount_field",
                    "agg": "sum",
                    "config": {"orientation": "horizontal", "sorted": "desc"},
                    "size": {"w": 4, "h": 5},
                    "description": "Which categories drive the most revenue?"
                },
                {
                    "title": "Top {items}",
                    "type": "table",
                    "columns": ["item_field", "amount_field", "secondary_amount_field"],
                    "sort": {"field": "amount_field", "direction": "desc"},
                    "size": {"w": 6, "h": 6},
                    "description": "Top performers ranked by revenue"
                },
                {
                    "title": "{breakdown} distribution",
                    "type": "pie",
                    "x": "breakdown_field",
                    "y": "amount_field",
                    "agg": "sum",
                    "config": {"donut": True},
                    "size": {"w": 6, "h": 6},
                    "description": "Revenue share across segments"
                }
            ]
        }
    },

    "customer_analytics": {
        "name": "Customer analytics",
        "description": "Customer behavior, segments, and value analysis",
        "signals": ["customer", "client", "user", "member", "subscriber", "retention", "churn", "lifetime"],
        "requires": {
            "customer_field": True,
            "date_field": True,
            "amount_field": True,
        },
        "layout": {
            "kpi_row": {
                "count": 4,
                "metrics": [
                    {"label": "Active customers", "agg": "count_distinct", "slot": "customer_field"},
                    {"label": "Avg order value", "agg": "avg", "slot": "amount_field"},
                    {"label": "Total {amount}", "agg": "sum", "slot": "amount_field"},
                    {"label": "Repeat rate", "agg": "custom", "slot": "customer_field", "description": "% of customers with 2+ orders"},
                ]
            },
            "charts": [
                {
                    "title": "Customer trend",
                    "type": "line",
                    "x": "date_field",
                    "y": "customer_field",
                    "agg": "count_distinct",
                    "config": {"areaFill": True},
                    "size": {"w": 8, "h": 5},
                    "description": "How is our customer base growing?"
                },
                {
                    "title": "{segment} breakdown",
                    "type": "pie",
                    "x": "segment_field",
                    "y": "customer_field",
                    "agg": "count_distinct",
                    "config": {"donut": True},
                    "size": {"w": 4, "h": 5},
                    "description": "Customer distribution by segment"
                },
                {
                    "title": "Top customers",
                    "type": "table",
                    "columns": ["customer_field", "amount_field", "order_count"],
                    "sort": {"field": "amount_field", "direction": "desc"},
                    "size": {"w": 6, "h": 6},
                    "description": "Highest-value customers"
                },
                {
                    "title": "{amount} by {segment}",
                    "type": "bar",
                    "x": "segment_field",
                    "y": "amount_field",
                    "agg": "sum",
                    "config": {"orientation": "horizontal"},
                    "size": {"w": 6, "h": 6},
                    "description": "Revenue contribution by segment"
                }
            ]
        }
    },

    "operations_overview": {
        "name": "Operations overview",
        "description": "Operational metrics, efficiency, and status tracking",
        "signals": ["shipping", "delivery", "fulfillment", "status", "operations", "efficiency", "discount", "cost"],
        "requires": {
            "date_field": True,
            "status_field": True,
        },
        "layout": {
            "kpi_row": {
                "count": 4,
                "metrics": [
                    {"label": "Total orders", "agg": "count", "slot": "id_field"},
                    {"label": "Avg {metric}", "agg": "avg", "slot": "metric_field"},
                    {"label": "On-time rate", "agg": "custom", "slot": "status_field"},
                    {"label": "Issue rate", "agg": "custom", "slot": "status_field"},
                ]
            },
            "charts": [
                {
                    "title": "Volume trend",
                    "type": "line",
                    "x": "date_field",
                    "y": "id_field",
                    "agg": "count",
                    "config": {"areaFill": True},
                    "size": {"w": 8, "h": 5},
                    "description": "Order volume over time"
                },
                {
                    "title": "Status breakdown",
                    "type": "pie",
                    "x": "status_field",
                    "y": "id_field",
                    "agg": "count",
                    "config": {"donut": True},
                    "size": {"w": 4, "h": 5},
                    "description": "Distribution of order statuses"
                },
                {
                    "title": "{metric} by {category}",
                    "type": "bar",
                    "x": "category_field",
                    "y": "metric_field",
                    "agg": "avg",
                    "config": {"orientation": "horizontal", "sorted": "desc"},
                    "size": {"w": 12, "h": 5},
                    "description": "Performance across categories"
                }
            ]
        }
    },

    "general_kpi": {
        "name": "General KPI tracker",
        "description": "Flexible layout for any dataset with at least one measure and one dimension",
        "signals": [],
        "requires": {
            "date_field": False,
            "amount_field": True,
            "category_field": True,
        },
        "layout": {
            "kpi_row": {
                "count": 3,
                "metrics": [
                    {"label": "Total {amount}", "agg": "sum", "slot": "amount_field"},
                    {"label": "Count", "agg": "count", "slot": "id_field"},
                    {"label": "Average {amount}", "agg": "avg", "slot": "amount_field"},
                ]
            },
            "charts": [
                {
                    "title": "{amount} by {category}",
                    "type": "bar",
                    "x": "category_field",
                    "y": "amount_field",
                    "agg": "sum",
                    "config": {"orientation": "horizontal", "sorted": "desc"},
                    "size": {"w": 6, "h": 6},
                    "description": "Breakdown by category"
                },
                {
                    "title": "{category} distribution",
                    "type": "pie",
                    "x": "category_field",
                    "y": "amount_field",
                    "agg": "sum",
                    "config": {"donut": True},
                    "size": {"w": 6, "h": 6},
                    "description": "Proportional share"
                }
            ]
        }
    }
}


def match_template(data_profile: dict, user_intent: str) -> str:
    """
    Score each template against the data profile and user intent.
    Returns the best matching template key.
    """
    intent_lower = user_intent.lower()
    scores = {}

    for key, template in TEMPLATES.items():
        score = 0
        # Check signal words in user intent
        for signal in template["signals"]:
            if signal in intent_lower:
                score += 3
        # Check signal words in field names
        field_names_lower = [f["name"].lower() for f in data_profile.get("fields", [])]
        for signal in template["signals"]:
            for fname in field_names_lower:
                if signal in fname:
                    score += 1
        scores[key] = score

    # If no strong match, fall back to general
    best = max(scores, key=scores.get)
    if scores[best] == 0:
        return "general_kpi"
    return best


def map_fields_to_template(template_key: str, data_profile: dict) -> dict:
    """
    Map actual field names from the data profile to template slots.
    Returns a dict of slot_name -> actual_field_name.
    """
    fields = data_profile.get("fields", [])
    dimensions = [f for f in fields if f.get("type") == "dimension"]
    measures = [f for f in fields if f.get("type") == "measure"]
    dates = [f for f in dimensions if f.get("subtype") == "date" or "date" in f["name"].lower()]

    mapping = {}

    # Date field
    if dates:
        mapping["date_field"] = dates[0]["name"]
    elif dimensions:
        mapping["date_field"] = dimensions[0]["name"]

    # Amount/measure field (primary)
    if measures:
        mapping["amount_field"] = measures[0]["name"]
        if len(measures) > 1:
            mapping["secondary_amount_field"] = measures[1]["name"]

    # Category field (first non-date dimension with reasonable cardinality)
    non_date_dims = [d for d in dimensions if d not in dates]
    if non_date_dims:
        # Prefer dimensions with cardinality 3-20 (good for bar charts)
        good_dims = [d for d in non_date_dims if 2 <= d.get("cardinality", 10) <= 20]
        mapping["category_field"] = good_dims[0]["name"] if good_dims else non_date_dims[0]["name"]
        # Second dimension for breakdown
        remaining = [d for d in non_date_dims if d["name"] != mapping.get("category_field")]
        if remaining:
            mapping["breakdown_field"] = remaining[0]["name"]
            mapping["segment_field"] = remaining[0]["name"]

    # Item/entity field (highest cardinality dimension — usually product name, customer name)
    if non_date_dims:
        sorted_by_card = sorted(non_date_dims, key=lambda d: d.get("cardinality", 0), reverse=True)
        mapping["item_field"] = sorted_by_card[0]["name"]

    # ID field
    id_candidates = [f for f in fields if "id" in f["name"].lower()]
    if id_candidates:
        mapping["id_field"] = id_candidates[0]["name"]
    elif dimensions:
        mapping["id_field"] = dimensions[0]["name"]

    # Customer field
    customer_candidates = [f for f in dimensions if any(w in f["name"].lower() for w in ["customer", "client", "user", "member"])]
    if customer_candidates:
        mapping["customer_field"] = customer_candidates[0]["name"]
    elif non_date_dims:
        mapping["customer_field"] = non_date_dims[0]["name"]

    # Status field
    status_candidates = [f for f in dimensions if any(w in f["name"].lower() for w in ["status", "state", "mode", "type"])]
    if status_candidates:
        mapping["status_field"] = status_candidates[0]["name"]

    # Metric field (for operations — secondary measure)
    if len(measures) > 1:
        mapping["metric_field"] = measures[1]["name"]
    elif measures:
        mapping["metric_field"] = measures[0]["name"]

    return mapping
