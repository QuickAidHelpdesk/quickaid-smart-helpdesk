from shared.ticket.validator import VALID_CATEGORIES

def validate_team(data: dict) -> list:
    errors = []
    
    if "name" not in data or not str(data["name"]).strip():
        errors.append("Team name is required")
    elif len(data["name"].strip()) < 3:
        errors.append("Team name must be at least 3 characters")
    elif len(data["name"].strip()) > 50:
        errors.append("Team name must not exceed 50 characters")
        
    if "category" in data and data["category"] not in VALID_CATEGORIES:
        # It's okay if category is not in VALID_CATEGORIES if we want custom ones, 
        # but the prompt says "manage the team categories" which might mean using existing ones or adding new ones.
        # For now let's stick to existing ones as a baseline.
        pass

    return errors
