import datetime
import pymysql
import pandas as pd
import numpy as np
con = pymysql.connect(host='localhost', user='root',password='Karelia',database= 'w3')

#customer - CustomerName, City, Country
#category - CategoryName
#employee - FirstName, LastName
#orders - OrderID, OrderDetailID (many)
#Products - ProductName (many)
#shippers - ShipperName
#supplier - SupplierName, Country

#time series analysis: 
#1. choose time series type (datetime,year-month,month, year)
#2. choose variable - can choose string (optional)
#3. choose aggregate - we pivot the variable with the time index
#suppliers.SupplierName,suppliers.Country,products.ProductName,products.Price
#customers.CustomerName,customers.City,customers,country,
def sales():
	con.connect()
	select_main = con.cursor()
	select_main.execute('call test_bi()')
	sales = select_main.fetchall()
	con.commit()
	con.close()
	field_names = [i[0] for i in select_main.description]
	sales = pd.DataFrame(sales,columns=field_names)
	sales = sales.set_index('OrderDate')
	sales.index = pd.to_datetime(sales.index)
	return sales
