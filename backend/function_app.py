import azure.functions as func

from blueprints.tickets import bp as tickets_bp
from blueprints.users import bp as users_bp
from blueprints.staff import bp as staff_bp
from blueprints.admin import bp as admin_bp

app = func.FunctionApp()

app.register_functions(tickets_bp)
app.register_functions(users_bp)
app.register_functions(staff_bp)
app.register_functions(admin_bp)
