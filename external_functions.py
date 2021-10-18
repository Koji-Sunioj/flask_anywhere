import pandas as pd
import datetime
import numpy as np
import matplotlib
from matplotlib import cm
import re

class Highcharts:
	def __init__(highchart,value,visual,agg_type,category=False,date_string=False,title=False):	
		highchart.value = value
		highchart.visual = visual
		highchart.agg_type = agg_type
		highchart.category = category
		highchart.date_string = date_string
		highchart.title = title

	def regex_labels(highchart,label):
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
	
	def agg_frame(highchart,data):
		#groupby gives one category, pivoting makes columns which gives multiple
		#group every aggregate centered around the OrderID to get correct values
		grouper = [highchart.category,'OrderID']
		grouper = list(dict.fromkeys(grouper))
		
		
		
		#if date string is requested
		if highchart.date_string:
			data['OrderDate'] = pd.to_datetime(data['OrderDate'])
			x_is_date = data[highchart.category].dtypes
			data = data.set_index('OrderDate')
			data.index = data.index.strftime(highchart.date_string)
			#if the chosen x axis is the actual date column
			if x_is_date == 'datetime64[ns]':
				data = data.groupby(grouper).aggregate({highchart.value:'sum'}).droplevel('OrderID')
				data = data.groupby(data.index).aggregate({highchart.value:highchart.agg_type})
				title = 'sales {} {} for {}'
				highchart.title = title.format(highchart.agg_type,highchart.category,highchart.regex_labels(highchart.value))
			
			#axes is string and numerical, aggregate where index is set as date
			else:
				#we group everything according to the date, key and orderid, quantity per orderid
				grouper.insert(0,'OrderDate')
				data = data.groupby(grouper).aggregate({highchart.value:'sum'}).droplevel('OrderID')
				data = pd.pivot_table(data,index='OrderDate',columns=highchart.category,values=highchart.value,aggfunc=highchart.agg_type).sort_index().fillna(0)
				title = '{} {} for {} between {} and {}'
				highchart.title = title.format(highchart.agg_type,highchart.value,highchart.regex_labels(highchart.category),data.index[0],data.index[-1])
				
		#no date string, normal aggregate
		else:
			value_is_string = data[highchart.value].dtypes
			if value_is_string == 'object' and highchart.agg_type == 'nunique':
				data = data.groupby(highchart.x).aggregate({highchart.y:highchart.agg_type})
			elif highchart.category == 'OrderID':
				
				data = data.groupby(grouper).aggregate({highchart.value:'sum'}).aggregate({highchart.value:highchart.agg_type})
				data = pd.DataFrame(data).T
				data.index = [highchart.agg_type]

			else:
				data = data.groupby(grouper).aggregate({highchart.value:'sum'}).groupby(level=0,axis=0).agg(highchart.agg_type)
			title = '{} {} per Order ID for {}'
			highchart.title = title.format(highchart.agg_type,highchart.value,highchart.regex_labels(highchart.category))
		data = data.fillna(0).round(2).sort_index()
		
		return data

	def agg_to_json(highchart,new_data):
		#series list is the array highcharts will interact with
		series = []
		#if there is one column, sort the values of the numerical column
		if len(new_data.columns) == 1 and highchart.category !='OrderDate':
			new_data = new_data.sort_values(highchart.value, ascending=False)
		#sort the columns according to whichever columns has the highest aggregate total
		else:
			new_data = new_data[new_data.sum().sort_values(ascending=False).index]
		
		#new_data = new_data.T if len(new_data.columns) < 20 and len(new_data.columns) > 1 else new_data
		
		#loop through the items as normal. scatter chart does not include zeros, otherwise the chart is cluttered
		for i in np.arange(0,len(new_data.columns)):
			if highchart.visual == 'scatter':
				stuff = {'name':str(new_data.columns[i]),'data':[round(col,2) if col > 0  else 'null' for col in new_data[new_data.columns[i]] ]}
			else:
				stuff = {'name':str(new_data.columns[i]),'data':[round(col,2) for col in new_data[new_data.columns[i]] ]}
			series.append(stuff)
		
		json_data = {'series':series,'title':highchart.title,'yAxis':{'title':highchart.category},'type':highchart.visual}
		xAxis = {'categories':[i for i in new_data.index],'title': {'text':new_data.index.name,'style':{'fontSize':'2px'}}}
		json_data['xAxis'] = xAxis
		return json_data

'''


			elif data[highchart.value].dtypes == 'object':
				print('shit2')
				data = pd.pivot_table(data,columns=highchart.x,index=data.index,values=highchart.y,aggfunc=highchart.agg_type)
				title = 'sales {} {} for {}'
				highchart.title = title.format(highchart.agg_type,highchart.y,highchart.regex_labels(highchart.x))
			
'''
