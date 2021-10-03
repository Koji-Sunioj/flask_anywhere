import datetime
import pymysql
import pandas as pd
import numpy as np
con = pymysql.connect(host='localhost', user='root',password='Karelia',database= 'w3')

def sales():
	#call stored procedure for the highcharts array
	con.connect()
	select_main = con.cursor()
	select_main.execute('call test_bi()')
	sales = select_main.fetchall()
	con.commit()
	con.close()
	field_names = [i[0] for i in select_main.description]
	sales = pd.DataFrame(sales,columns=field_names)
	sales['OrderID'] = sales['OrderID'].astype(str)
	sales['OrderDetailID'] = sales['OrderDetailID'].astype(str)
	sales['OrderDate'] = pd.to_datetime(sales['OrderDate'])
	return sales

def custom_query(command,joins):
	#query constructed from table names, joins as attributed by Db_command class
	con.connect()
	select_main = con.cursor()
	statement = 'select {} from orders {};'.format(command,joins)
	select_main.execute(statement)
	field_names = [i[0] for i in select_main.description]
	rows = select_main.fetchall()
	con.commit()
	con.close()
	sales = pd.DataFrame(rows,columns=field_names)
	return sales


class Db_command:
	#a class structure for creating an sql query depending on the requests column names
	#everything is centered around the orders table. not sure if will use yet, since 
	#the current stored procedure gives the meta data needed for the html columns, and is already 
	#sunken in terms of speed
	def __init__(query,keys=False,command=False,joins=False):
		#get the table names and column names from database
		con.connect()
		select_main = con.cursor()
		select_main.callproc('db_rels')
		rows = select_main.fetchall()
		con.commit()
		con.close()
		keys = {i[1]:{"command":i[0]+"."+ i[1],"link":i[0]} for i in rows}
		
		#create custom keys for aliases in our key
		keys['Total'] = {"command":"products.Price * order_details.Quantity as 'Total'","link":"products"}
		keys['EmployeeName'] = {"command":"concat( employees.FirstName,' ',employees.LastName) as 'EmployeeName'","link":"employees"}
		keys['CustomerCity'] = {"command":"customers.City as 'CustomerCity'",'link':'customers'}
		keys['SupplierCountry'] = keys.pop('Country')
		keys['CustomerCountry'] = {"command":"customers.Country as 'CustomerCountry'",'link':'customers'}
		
		query.keys = keys
		query.command = command
		query.joins = joins
		
	def db_rel(query,col_array):
		#joins for the stored procedure in current use, in sequence
		
		ord_ord = 'join order_details on order_details.OrderID = orders.OrderID'
		pro_ord = 'join products on order_details.ProductID = products.ProductID'
		pro_cat = 'join categories on products.CategoryID = categories.CategoryID'
		pro_sup = 'join suppliers on products.SupplierID = suppliers.SupplierID'
		cus_ord = 'join customers on customers.CustomerID = orders.CustomerID'
		ord_emp = 'join employees on orders.EmployeeID = employees.EmployeeID'
		ord_shi = 'join shippers on orders.ShipperID = shippers.ShipperID'
		indexer = [ord_ord,pro_ord,pro_cat,pro_sup,cus_ord,ord_emp,ord_shi]
		
		#reference for needed join requests depending its relation to the orders table
		refs = {}
		refs['orders'] = []
		refs['customers'] = [4]
		refs['employees'] = [5]
		refs['shippers'] = [6]
		refs['order_details'] = [0]
		refs['products'] = [0,1]
		refs['suppliers'] = [0,1,3]
		refs['categories'] = [0,1,2]
		
		#parse the referred tables and proper column name from db
		rels = query.keys
		rels = [rels[column] for column in col_array]
		
		#get the index of sequencial join clauses for relevant columns
		joins = [num for i in rels for num in refs[i['link']]]
		joins = list(set(joins))
		joins.sort()
		joins = [indexer[i] for i in joins]
		joins = " ".join(joins)
		
		#join query string into one
		command = [i['command'] for i in rels]
		command = ",".join(command)
		
		#add them to the class
		query.command = command
		query.joins = joins

