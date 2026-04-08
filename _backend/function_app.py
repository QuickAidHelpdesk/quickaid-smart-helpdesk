import azure.functions as func

from blueprints.tickets import bp as tickets_bp

app = func.FunctionApp()

app.register_functions(tickets_bp)