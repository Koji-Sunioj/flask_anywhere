import datetime
import pymysql
import pandas as pd
import numpy as np
import re
import external_functions
con = pymysql.connect(host='localhost', user='root',password='Karelia',database= 'w3')

def check_eval(value):
    result = str(value) if isinstance(value,(float, int)) else '"{}"'.format(value)
    return result


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

def custom_query(command,joins,wheres=False):
	#query constructed from table names, joins as attributed by Db_command class
	con.connect()
	select_main = con.cursor()
	statement = 'select {} from orders {}'.format(command,joins)
	if wheres:
		statement = statement + ' where '+ "and".join(wheres) 
	print(statement)
	select_main.execute(statement)
	field_names = [i[0] for i in select_main.description]
	rows = select_main.fetchall()
	con.commit()
	con.close()
	sales = pd.DataFrame(rows,columns=field_names)
	sales = sales.loc[:,~sales.columns.duplicated()]
	sales['OrderID'] = sales['OrderID'].astype(str)
	return sales

class Db_command:
	#a class structure for creating an sql query depending on the requests column names
	def __init__(query,keys=False,command=False,joins=False,wheres=False):
		#get the table names and column names from database
		con.connect()
		select_main = con.cursor()
		select_main.callproc('db_rels')
		rows = select_main.fetchall()
		con.commit()
		con.close()
		keys = {i[1]:{"command":i[0]+"."+ i[1],"link":i[0]} for i in rows}

		del keys['Country']
		del keys['iso_code']
		del keys['City']
		del keys['point_id']

		#create custom keys for aliases in our key
		keys['Total'] = {"command":"products.Price * order_details.Quantity as 'Total'","link":"products"}
		keys['SalesPerson'] = {"command":"concat( employees.FirstName,' ',employees.LastName) as 'SalesPerson'","link":"employees"}
		keys['CustomerCity'] = {"command":"customers.City as 'CustomerCity'",'link':'customers'}
		keys['SupplierCity'] = {"command":"suppliers.City as 'SupplierCity'",'link':'suppliers'}
		keys['CustomerCountry'] = {"command":"customers.Country as 'CustomerCountry'",'link':'customers'} 
		keys['SupplierCountry'] =  {'command':"suppliers.Country as 'SupplierCountry'",'link':'suppliers'}
		keys['customer_iso'] ={"command": "customer_iso_ref.iso_code as 'customer_iso'","link":"customer_iso"}
		keys['supplier_iso'] = {"command":"supplier_iso_ref.iso_code as 'supplier_iso'","link":"supplier_iso"}
		keys['customer_point'] = {"command":"customers.City as 'customer_point',customer_point_ref.latitude as 'customer_lat',customer_point_ref.longitude as 'customer_lon'",'link':'customer_point'}
		keys['supplier_point'] = {"command":"suppliers.City as 'supplier_point',supplier_point_ref.latitude as 'supplier_lat',supplier_point_ref.longitude as 'supplier_lon'",'link':'supplier_point'}

		query.keys = keys
		query.command = command
		query.joins = joins
		query.wheres = []

	def db_rel(query,col_array,filters=False):
		ord_ord = 'join order_details on order_details.OrderID = orders.OrderID'
		pro_ord = 'join products on order_details.ProductID = products.ProductID'
		pro_cat = 'join categories on products.CategoryID = categories.CategoryID'
		pro_sup = 'join suppliers on products.SupplierID = suppliers.SupplierID'
		cus_ord = 'join customers on customers.CustomerID = orders.CustomerID'
		ord_emp = 'join employees on orders.EmployeeID = employees.EmployeeID'
		ord_shi = 'join shippers on orders.ShipperID = shippers.ShipperID'
		cus_iso = "join country_iso as customer_iso_ref on customers.iso_id = customer_iso_ref.country_id"
		sup_iso = "join country_iso as supplier_iso_ref on suppliers.iso_id = supplier_iso_ref.country_id"
		cus_poi = "join city_points as customer_point_ref on customers.point_id = customer_point_ref.city_id"
		sup_poi = "join city_points as supplier_point_ref on suppliers.point_id = supplier_point_ref.city_id"
		indexer = [ord_ord,pro_ord,pro_cat,pro_sup,cus_ord,ord_emp,ord_shi,cus_iso,sup_iso,cus_poi,sup_poi]

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
		refs['customer_iso'] = [4,7]
		refs['supplier_iso'] = [0,1,3,8]
		refs['customer_point'] = [4,9]
		refs['supplier_point'] = [0,1,3,10]

		#take the values from array and parse it with the specified keys
		rels = query.keys
		rels = [rels[column] for column in col_array]
		rels_copy = rels.copy()

		if filters:
			tester = {}
			for i in filters:
				rels.append(query.keys[i['column']])
				command = query.keys[i['column']]['command']
				if ' as ' in command: command = command.split(' as ')[0]
				if command in tester:
					tester[command]['values'].append(i['parameter'])
					tester[command]['operand'].append(i['operand'])
				else:
					tester[command] = {'values':[ i['parameter'] ],'operand':[i['operand']],'origin':i['column']}
			
			date_pattern = "^([0-9]{4})[-]([0]?[1-9]|[1][0-2])[-]([0][1-9]|[1|2][0-9]|[3][0|1])$"
			for key,val in tester.items():
				is_dates = all([bool(re.search(date_pattern,str(i))) for i in val['values']])
				is_nums = all([isinstance(i,(float,int)) for i in val['values']])
				if not is_nums and not is_dates:
					values = [ '"%s"'%(cat) for cat in val['values']]
					command = "(%s in(%s))" %(key,",".join(values))
					query.wheres.append(command)
				elif is_nums or is_dates:
					command = [key+o+check_eval(v) for o,v in zip(val['operand'],val['values'])]
					command = "(%s)" %" and ".join(command)
					query.wheres.append(command)
				
		#get the index of sequencial join clauses for relevant columns
		joins = [num for i in rels for num in refs[i['link']]]
		joins = list(set(joins))
		joins.sort()
		joins = [indexer[i] for i in joins]
		joins = " ".join(joins)

		#join query string into one
		command = [i['command'] for i in rels_copy]
		command = ",".join(command) + ",orders.OrderID" if len(command) > 0 else "orders.OrderID"

		#add them to the class
		query.command = command
		query.joins = joins
