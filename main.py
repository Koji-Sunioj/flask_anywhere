from flask import Flask, redirect, url_for, request,json,session,render_template,jsonify
import db_functions
import pymysql
import external_functions
import re
import json
import numpy as np
import math

app = Flask(__name__)
app.secret_key = 'ironpond_2'

@app.route('/bi_data', methods=['GET','POST'])
def bi_data():
	#data = db_functions.sales()
	if request.method == 'POST':
		#send the form to a dictionary
		send_values = {key:val for key,val in request.form.items()}
		filters = json.loads(send_values['filters']) if 'filters' in send_values else False
		
		if send_values['visual'] == 'map':
			keys =  external_functions.translate_category_map()
			send_values['category'] = keys[send_values['category']]
		
		#initialize query constructor, with list from ajax request
		query = db_functions.Db_command()
		col_array = [val for key,val in send_values.items() if key in ['category','value']]
		col_array = list(set(col_array))
		'date_string' in send_values and col_array.append('OrderDate')
		
		query.db_rel(col_array,filters)
		data = db_functions.custom_query(query.command,query.joins,query.wheres)
		
		#set the attributes from the data
		highchart = external_functions.Highcharts(send_values['visual'],send_values['agg_type'])
		highchart.value = send_values['value'] if 'value' in send_values else False
		highchart.category = send_values['category'] if 'category' in send_values else False
		highchart.date_string = send_values['date_string'] if 'date_string' in send_values else False
		
		#create the frame and array.grab the meta data for the html divs.
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
		
		#remove last cookie, reload it with new attributes
		session['state'] = vars(highchart)
		session['warnings'] = json.loads(send_values['warnings'])
		session['wheres'] = filters
		
		return jsonify(new_json)
		
	elif request.method == 'GET' and 'state' not in session:
		
		#the stored procedure serves both the meta data, and session requested chart
		data = db_functions.sales()
		
		#for the datalist html elements
		filters = data[data.columns[~data.columns.str.contains('iso|OrderDetailID|lat|lon')]].copy().sort_values('OrderDate').select_dtypes(include=['object'])
		filters = filters[filters.nunique().sort_values().index]
		cols = [" ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", col)).strip() +': '+str(value) for col in filters.columns for value in filters[col].unique()]
		
		#plug in the variables
		highchart = external_functions.Highcharts('map','sum',value='Total',category='SupplierCity')

		#for the cookies
		for_next = vars(highchart)
		
		if for_next['visual'] == 'map':
			keys =  external_functions.translate_category_map()
			if 'City' in highchart.category: data = data.rename(columns={highchart.category: keys[highchart.category]}) 
			for_next['category'] = keys[for_next['category']]
			
		#create the frame and json array. meta data and state for html interfacing
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
		
		check_point = "".join(data.columns)
		if 'point' in check_point: data = data.rename(columns={"".join(data.columns[data.columns.str.contains('point')]):highchart.category})
		meta_raw = data[data.columns[~data.columns.str.contains('iso|OrderDetailID|lat|lon')]].copy()
	
		#we need metadata for the html elements and save in cookies
		meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(meta_raw.nunique().index,meta_raw.nunique().values,meta_raw.dtypes)]
		meta_data.reverse()
		
		new_json['meta_data'] = meta_data
		new_json['state'] = vars(highchart)
		new_json['warnings'] = True
		new_json['filters'] = cols
		new_json['wheres'] = False
		
		#save attributes to cookies
		session['state'] = for_next
		session['warnings'] = True
		session['wheres'] = False
		
		return jsonify(new_json)
		
	elif request.method == 'GET' and 'state' in session:
		#the stored procedure serves both the meta data, and session requested chart
		data = db_functions.sales()
		
		
		#for the datalist html elements
		filters = data[data.columns[~data.columns.str.contains('iso')]].sort_values('OrderDate').select_dtypes(include=['object'])
		filters = filters[filters.nunique().sort_values().index]
		cols = [" ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", col)).strip() +': '+str(value) for col in filters.columns for value in filters[col].unique()]
		
		num_filters = data[data.columns[~data.columns.str.contains('lat|lon')]].select_dtypes(include=['int64','float64']).aggregate(['max','min'])
		num_filters = num_filters.to_dict()
		num_filters['Order Date'] = data.OrderDate.sort_values().astype(str).unique().tolist()
		print(num_filters)
		
		
		
		#get the attributes stored in session, send to the class structure. no changes to cookies are made here.
		for_next = session['state']
		if for_next['visual'] == 'map':
			keys =  external_functions.translate_category_map()
			if 'City' in for_next['category']: data = data.rename(columns={for_next['category']: keys[for_next['category']]}) 
			for_next['category'] = keys[for_next['category']]
		
		highchart = external_functions.Highcharts(**for_next)
		
		#create the frame and json array. meta data and state for html interfacing
		command = "&".join(["(data['{}'] == '{}')".format(value['column'],value['parameter']) for value in session['wheres']]) if session['wheres'] else False
		data = data[eval(command)] if command else data
		
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
		
		check_point = "".join(data.columns)
		
		if 'point' in check_point: data = data.rename(columns={for_next['category']:highchart.category}) 
		meta_raw = data[data.columns[~data.columns.str.contains('iso|OrderDetailID|lat|lon')]].copy()
		
		#we need metadata for the html elements and save in cookies
		meta_data = [{'name':i[0],'dtype':i[1].name}   for i in zip(meta_raw.nunique().index,meta_raw.dtypes)]
		meta_data.reverse()
		
		#print(data.Total)
		
		new_json['wheres'] = session['wheres']
		new_json['meta_data'] = meta_data
		new_json['state'] = vars(highchart)
		new_json['warnings'] = session['warnings']
		new_json['filters'] = cols
		new_json['num_filters'] = num_filters
		return jsonify(new_json)

@app.route("/")
def bi_page():
	#session.pop('state',None)
	#session.pop('wheres',None)
	return render_template('index.html')


@app.route("/test/")
def test():
	data = db_functions.sales()
	
	pages = math.ceil(len(data) / 10)
	page = 1
	table = data[data.columns[~data.columns.str.contains('iso|lat|lon|OrderDetailID')]].sort_values(['OrderDate','OrderID']).head(10).astype(str)
	
	new_data = {}
	customers = table.CustomerName.tolist()
	for dat in table:
		selected = table[dat]
		new_data[dat] = []
		for num,value in enumerate(selected.values):
			if len(new_data[dat])> 0 and value == new_data[dat][-1]['name'] and customers[num-1] == customers[num]:
				new_data[dat][-1]['span']  += 1
			else:
				new_data[dat].append({'name':value,'span':1,'index':num}) 
	
	date_cols = data.OrderDate.sort_values().astype(str).unique()
	print(date_cols)
	data = data.sort_values('OrderDate').select_dtypes(include=['object'])
	
	data = data[data.nunique().sort_values().index]
	cols = [" ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", col)).strip() +': '+str(value) for col in data.columns for value in data[col].unique()]
	
	meta_data = [{'name': " ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", i[0])).strip(),'count':int(i[1])}   for i in zip(data.nunique().index,data.nunique().values)]
	return render_template('test.html',cols=cols,meta_data=meta_data,new_data=json.dumps(new_data),page=page,pages=pages,date_cols=date_cols) #
	
@app.route("/filter/",methods=['POST'])
def filter():
	json_filters = json.loads(request.form['filterData'])
	data = db_functions.sales()
	data = data.sort_values('OrderDate').select_dtypes(include=['object'])
	data = data[data.nunique().sort_values().index]
	command = "&".join(["(data['{}'] == '{}')".format(value['column'],value['parameter']) for value in json_filters])
	data = data[eval(command)] if command else data
	meta_data = [{'name': " ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", i[0])).strip(),'count':int(i[1])}   for i in zip(data.nunique().index,data.nunique().values)]
	
	return jsonify(meta_data)

	
if (__name__ == "__main__"):
	app.run(port = 5000, debug=True)




