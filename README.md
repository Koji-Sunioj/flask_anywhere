# flask_anywhere
making a new app using a w3 schools database to render customizable charts in a business-intelligence sort of interface, which will be customizable according to client selections.

http://kokogabriel.pythonanywhere.com/

there will be additions of maps as well

i did not use the same function which serves the index page, to send the data from flask to the html page: it is more managable to send a get request once the page is loaded from the external js file. rendering json from flask causes formatting errors and is fickle at times.

the way it works is:

1. client loads the page, both the meta data and data is loaded from one stored procedure: relatively high performance operation, but the alternative would be to call three stored procedures to get the meta sales data. speed is already sunk for getting the meta data, might as well use it for the the data request too.

2. client sends a post request: a function is called to piece together a custom made sql query without adding unneeded columns (like in the main stored procedure), the attributes are saved in the cookie session and data is updated on the graph.

3. client relads the page after posting data: one stored procedure is called for the meta and sales data, but with attributes from the sesion.

the functions have been simplified to a really small length. the title will be added soon.
