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
		
		if send_values['visual'] == 'map':
			keys =  external_functions.translate_category_map()
			send_values['category'] = keys[send_values['category']]
		
		#initialize query constructor, with list from ajax request
		query = db_functions.Db_command()
		col_array = [val for key,val in send_values.items() if key in ['category','value']]
		col_array = list(set(col_array))
		'date_string' in send_values and col_array.append('OrderDate')
		query.db_rel(col_array)

		data = db_functions.custom_query(query.command,query.joins)
		
		#set the attributes from the data
		highchart = external_functions.Highcharts(send_values['visual'],send_values['agg_type'])
		highchart.value = send_values['value'] if 'value' in send_values else False
		highchart.category = send_values['category'] if 'category' in send_values else False
		highchart.date_string = send_values['date_string'] if 'date_string' in send_values else False
		
		#create the frame and array.grab the meta data for the html divs.
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
		
		#remove last cookie, reload it with new attributes
		session.pop('state',None)
		session.pop('warnings',None)
		session['state'] = vars(highchart)
		session['warnings'] = send_values['warnings']
		
		return jsonify(new_json)
		
	elif request.method == 'GET' and 'state' not in session:
		#the stored procedure serves both the meta data, and session requested chart
		data = db_functions.sales()
		
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
		new_json['warnings'] = 'true'
		
		#save attributes to cookies
		session['state'] = for_next
		session['warnings'] = 'true'
		return jsonify(new_json)
		
	elif request.method == 'GET' and 'state' in session:
		
		#the stored procedure serves both the meta data, and session requested chart
		data = db_functions.sales()
		
		#get the attributes stored in session, send to the class structure. no changes to cookies are made here.
		for_next = session['state']
		if for_next['visual'] == 'map':
			keys =  external_functions.translate_category_map()
			if 'City' in for_next['category']: data = data.rename(columns={for_next['category']: keys[for_next['category']]}) 
			for_next['category'] = keys[for_next['category']]
		
		highchart = external_functions.Highcharts(**for_next)
		
		#create the frame and json array. meta data and state for html interfacing
		new_data = highchart.agg_frame(data)
		new_json = highchart.agg_to_json(new_data)
		
		check_point = "".join(data.columns)
		
		if 'point' in check_point: data = data.rename(columns={for_next['category']:highchart.category}) 
		meta_raw = data[data.columns[~data.columns.str.contains('iso|OrderDetailID|lat|lon')]].copy()
		
		#we need metadata for the html elements and save in cookies
		meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(meta_raw.nunique().index,meta_raw.nunique().values,meta_raw.dtypes)]
		meta_data.reverse()
		
		new_json['meta_data'] = meta_data
		new_json['state'] = vars(highchart)
		new_json['warnings'] = session['warnings']
		
		return jsonify(new_json)

@app.route("/")
def bi_page():
	#session.pop('state',None)
	return render_template('index.html')


@app.route("/test/")
def test():
	data = db_functions.sales()
	
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
	
	data = data.sort_values('OrderDate').select_dtypes(include=['object'])
	data = data[data.nunique().sort_values().index]
	cols = [" ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", col)).strip() +': '+str(value) for col in data.columns for value in data[col].unique()]
	
	meta_data = [{'name': " ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", i[0])).strip(),'count':int(i[1])}   for i in zip(data.nunique().index,data.nunique().values)]
	return render_template('test.html',cols=cols,meta_data=meta_data,new_data= json.dumps(new_data)) #
	
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




