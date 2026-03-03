from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required

@login_required
def dashboard_redirect(request):
    """
    Use Case: Secure Role-Based Entry.
    Automatically routes users based on their 'accounts.User' role.
    """
    if request.user.role == 'manager':
        return redirect('/admin/')
    elif request.user.role == 'customer':
        return redirect('/api/deals/') # We created this DealZone earlier
    elif request.user.role == 'supplier':
        return redirect('/api/inventory/reorders/') # Future scope
    return redirect('/')