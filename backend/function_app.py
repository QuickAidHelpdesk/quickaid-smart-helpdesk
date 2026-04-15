import azure.functions as func

from blueprints.tickets import bp as tickets_bp
from blueprints.users import bp as users_bp

app = func.FunctionApp()

app.register_functions(tickets_bp)
app.register_functions(users_bp)