import pandas as pd
import datetime
import numpy as np
import matplotlib
from matplotlib import cm
import re


def html_table(table,page):
	table = table[table.columns[~table.columns.str.contains('iso|lat|lon|OrderDetailID')]].sort_values(['OrderDate','OrderID']).round(2).astype(str)
	table = table.iloc[page * 20 - 20:page * 20]
	test = []
	customers = table.CustomerName.tolist()
	for dat in table:
		selected = table[dat]
		new_data = {'column':dat,'values':[]}
		for num,value in enumerate(selected.values):
			if len(new_data['values'])> 0 and value == new_data['values'][-1]['name'] and customers[num-1] == customers[num]:
				new_data['values'][-1]['span']  += 1
			else:
				new_data['values'].append({'name':str(value),'span':1,'index':num})
		test.append(new_data)		
	return test

def translate_category_map():
	keys = {'CustomerCountry':'customer_iso','SupplierCountry':'supplier_iso','CustomerCity':'customer_point','SupplierCity':'supplier_point'}
	return keys

def check_eval(value):
	result = value if isinstance(value,(float, int)) else '"{}"'.format(value)
	return result

def category_datalist(frame):
	filters = frame[frame.columns[~frame.columns.str.contains('iso')]].sort_values('OrderDate').select_dtypes(include=['object'])
	filters = filters[filters.nunique().sort_values().index]
	cols = [" ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", col)).strip() +': '+str(value) for col in filters.columns for value in filters[col].unique()]
	return cols

def numeric_filters(frame):
	new_frame = frame[frame.columns[~frame.columns.str.contains('lat|lon')]].set_index('OrderID').select_dtypes(include=['int64','float64','datetime64[ns]'])
	new_frame = new_frame.groupby(new_frame.index).sum()
	new_frame = new_frame.aggregate(['max','min'])
	new_frame['Price'] = frame.Price.aggregate(['max','min'])
	new_frame['OrderDate'] = frame.OrderDate.aggregate(['max','min'])
	num_filters = new_frame.fillna(0).round(2).astype(str).to_dict()
	
	return num_filters

def frame_filters(frame,filters):
	#filter by values by OrderID per sales order, or OrderDetailID for rows in sales order
	tester = {}
	translator = {'=':'==','>':'>','<':'<'}
	
	for i in filters:
		query = ("(frame['%s'] %s %s)" % (i['column'],translator[i['operand']],check_eval(i['parameter'])) )
		tester[i['column']] = [query] if i['column'] not in tester else tester[i['column']] + [query]
	
	for key,val in tester.items():
		check_dtype = frame[key].dtype.name != 'object'
		command = eval("&".join(tester[key])) if check_dtype else eval("|".join(tester[key]))
		frame = frame[command]
	
	return frame


class Highcharts:
	def __init__(highchart,visual,agg_type,value=False,category=False,date_string=False,title=False):	
		highchart.value = value
		highchart.visual = visual
		highchart.agg_type = agg_type
		highchart.category = category
		highchart.date_string = date_string
		highchart.title = title

	def regex_labels(highchart,label):
		#regex splitting of column strings for html rendering
		new_label = re.split("([A-Z][a-z]+|[A-Z][A-Z]+)", label)
		new_label = [word for word in  new_label if word]
		new_label = " ".join(new_label)
		return new_label

	def color_gradient(highchart,bins):
		#create a gradient of color depending on bins
		cmap = cm.get_cmap('coolwarm',len(bins)) 
		colors = []
		for i in range(cmap.N):
			rgba = cmap(i)
			colors.append(matplotlib.colors.rgb2hex(rgba))
		return colors
		
	def translate_map_category(highchart):
		keys = translate_category_map()
		keys = dict((value,key) for key,value in keys.items())
		if isinstance(highchart.category,list):
			highchart.category = [col for col in highchart.category if 'point' in col]
			highchart.category = "".join(highchart.category)
		highchart.category = keys[highchart.category] if highchart.category in keys else highchart.category

	def handle_title(highchart,date_index=False):
		#create the highchart title
		label = 'Count' if highchart.agg_type == 'nunique' else  'Euro ' + highchart.agg_type.title()
		label = 'Sales Order ' + label
		label = label + ' per ' + highchart.regex_labels(highchart.category).title() if highchart.category else label
		label = label + ': between {} and {}'.format(date_index[0],date_index[-1]) if highchart.date_string and len(date_index) > 1 else label
		return label
			
	def agg_frame(highchart,data):
		#grouping revolves around OrderID for sales view
		grouper = [highchart.category,'OrderID']
		grouper = list(dict.fromkeys(grouper))
		grouper = [i for i in grouper if i]
		values = highchart.value if highchart.value and highchart.agg_type != 'nunique' else 'OrderID'
		
		#if date string is requested
		if highchart.date_string:
			data = data.reset_index()
			data['OrderDate'] = pd.to_datetime(data['OrderDate'])
			data = data.set_index('OrderDate')
			data.index = data.index.to_period('Q').astype(str) if highchart.date_string == 'quarter' else data.index.strftime(highchart.date_string)
			grouper.insert(0,'OrderDate')
			columns = highchart.category if highchart.category else None
			if highchart.value and highchart.value != 'Price': data = data.groupby(grouper).aggregate({highchart.value:'sum'}).reset_index()
			
			#data = pd.pivot_table(data,index='OrderDate',columns=columns,values=values,aggfunc=highchart.agg_type)
			if highchart.agg_type == 'cumsum':
				data = pd.pivot_table(data,index='OrderDate',columns=columns,values=values,aggfunc='sum').fillna(0).cumsum()
			else:
				data = pd.pivot_table(data,index='OrderDate',columns=columns,values=values,aggfunc=highchart.agg_type)
			#pd.pivot_table(data,index='OrderDate',columns=columns,values=values,aggfunc='sum').fillna(0).cumsum()
			print(data)
			unique_or = 'count' if  highchart.agg_type == 'nunique' else highchart.agg_type
			data.columns = [unique_or] if len(data.columns) == 1 else data.columns
			data = data.sort_index().fillna(0)
			if highchart.date_string == '%w': data.index = data.index.map({'1':'Monday','2':'Tuesday','3':'Wednesday','4':'Thursday','5':'Friday','6':'Saturday','7':'Sunday'})
			highchart.title = '{}'.format(highchart.handle_title(data.index))
			
		#no date string, normal aggregate
		elif highchart.date_string == False:
			if highchart.category and 'point' in highchart.category:
				grouper.remove(highchart.category)
				cat_label = highchart.category.split('_')[0]
				point_filter = data.columns[data.columns.str.contains('point|lat|lon')]
				point_filter = point_filter[point_filter.str.contains(cat_label)]
				highchart.category = point_filter.tolist()
				grouper.extend(point_filter)
			if all([highchart.value,highchart.value != 'Price']):
				data = data.groupby(grouper).aggregate({highchart.value:'sum'}).reset_index()
			data = data.groupby(highchart.category) if highchart.category else data
			data = data.aggregate({values:highchart.agg_type})
			data = pd.DataFrame(data) if len(data) == 1 and type(data).__name__ == 'Series' else data
			data.columns = [highchart.agg_type]  if highchart.agg_type != 'nunique' else ['count']
			
			highchart.translate_map_category()
			highchart.title = '{}'.format(highchart.handle_title())
	
		data = data.fillna(0).round(2) 
		return data

	def agg_to_json(highchart,new_data):
		#series list is the array highcharts will interact with
		series = []
		
		#if there is one column, sort the values of the numerical column
		if highchart.date_string == False:
			bar_bool = highchart.visual != 'bar'
			new_data = new_data.sort_values(new_data.columns[0],ascending=bar_bool) 
		
		if highchart.visual == 'map' and 'Country' in highchart.category :
			stuff = {'name':highchart.regex_labels(highchart.category),'data':[[country.lower(),float(value[0])] for country,value in zip(new_data.index,new_data.values)]}
			series.append(stuff)
		
		elif highchart.visual == 'map' and 'City' in highchart.category:
			new_data = new_data.reset_index()
			data = [{'name':row[0],'lat':row[1],'lon':row[2],'z':row[3]} for row in new_data.values ] 
			series.append({'name':'Cities'})
			y_label = 'count' if highchart.agg_type == 'nunique' else highchart.value
			series.append({'name':y_label,'animation':False,'type':'mapbubble','minSize':3,'maxSize':10,'data':data}) 
			
		elif highchart.visual == 'pie' and highchart.date_string == False:
			if len(new_data.index) == 1: new_data.index.name = new_data.index[0]
			unique_or = 'count' if  highchart.agg_type == 'nunique' else highchart.agg_type
			data = [{'name':name,'y':float(value)} for name,value in zip(new_data.index, new_data[unique_or].values) ] 
			series = [{'data':data,'name':highchart.regex_labels(new_data.index.name) }]
			
			
		elif highchart.visual != 'map':
			for i in np.arange(0,len(new_data.columns)):
				stuff = {'name':str(new_data.columns[i]),'data':[round(col,2) for col in new_data[new_data.columns[i]] ]}
				series.append(stuff)	
		
		y_label = 'count' if highchart.agg_type == 'nunique' else highchart.value
		json_data = {'series':series,'title':highchart.title,'yAxis':{'title': {'text':y_label.title()}},'type':highchart.visual}
		x_label = 'OrderDate' if highchart.date_string else highchart.category
		x_label = 'Orders' if x_label == False else highchart.regex_labels(x_label)
		categories = [i for i in new_data.index ]
		xAxis = {'categories':categories,'title': {'text':x_label}}
		json_data['xAxis'] = xAxis
		return json_data

