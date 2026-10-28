from copy import deepcopy


DEFAULT_COURSES = [
    {"name": "Car \u2014 Manual", "pricePerSession": 400, "defaultDays": 20},
    {"name": "Car \u2014 Automatic", "pricePerSession": 500, "defaultDays": 20},
    {"name": "Two-wheeler", "pricePerSession": 400, "defaultDays": 20},
    {"name": "Commercial (Truck/Bus)", "pricePerSession": 900, "defaultDays": 30},
]


def default_courses():
    return deepcopy(DEFAULT_COURSES)
