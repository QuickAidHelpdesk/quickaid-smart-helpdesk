from utils.telemetry import configure_monitoring

configure_monitoring()

import azure.functions as func

from blueprints.tickets import bp as tickets_bp
from blueprints.users import bp as users_bp
from blueprints.agent import bp as agent_bp
from blueprints.admin import bp as admin_bp
from blueprints.insights import bp as insights_bp
from blueprints.teams import bp as teams_bp
from blueprints.escalation import bp as escalation_bp
from blueprints.admin_notes import bp as admin_notes_bp
from blueprints.notifications import bp as notifications_bp

app = func.FunctionApp()

app.register_functions(tickets_bp)
app.register_functions(users_bp)
app.register_functions(agent_bp)
app.register_functions(admin_bp)
app.register_functions(insights_bp)
app.register_functions(teams_bp)
app.register_functions(escalation_bp)
app.register_functions(admin_notes_bp)
app.register_functions(notifications_bp)
