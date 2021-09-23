import pandas as pd
import datetime
import numpy as np

#we offer: 
#1. correlative (x,y axis with category being optional)
#2. time series, with aggregate type 

class Highcharts:
	def __init__(highchart,x,y,visual,chart_type,agg_type=False,date_string=False,title=False,corr_cat=False,check_vals=False):
		highchart.x = x
		highchart.y = y
		highchart.visual = visual
		highchart.chart_type = chart_type
		highchart.agg_type = agg_type
		highchart.date_string = date_string
		highchart.title = title
		highchart.corr_cat = corr_cat
		highchart.check_vals = check_vals
		
	def bool_scatter(highchart,new_data):
		#this is specifically for scatter charts with string axes to inrease size based on category
		bool_point = new_data.copy()
		bool_point = bool_point[bool_point.columns].replace({0:np.nan})
		bool_point.index = np.arange(len(new_data.index))
		bool_point.columns = np.arange(len(new_data.columns))
		bool_point = bool_point.melt(ignore_index=False).reset_index()
		bool_point['bin'] = pd.cut(bool_point['value'],5)
		bool_point = bool_point.dropna()
		return bool_point
		
		
	def corr_frame(highchart,data):
		data['OrderDate'] = data['OrderDate'].astype(str)
		
		#boolean list to be used later: checks which axes are numerical
		test = [data.reset_index()[highchart.x].dtype.name,data.reset_index()[highchart.y].dtype.name]
		test = [i not in ['object','datetime64[ns]'] for i in test]
		highchart.check_vals = test
		#if there is correlativate categoy, and both axes are numerical: make a pivot table with top index as column, followed by numerics
		if highchart.corr_cat and all(highchart.check_vals):
			data = pd.pivot_table(data,index=data.index,values=[highchart.x,highchart.y],columns=[highchart.corr_cat]).swaplevel(0, 1, axis=1).sort_index(axis=1)
		
		#dataframe with string columns as axes
		elif highchart.corr_cat and not all(highchart.check_vals):
			data = pd.pivot_table(data,columns=highchart.x,index=highchart.y,values=highchart.corr_cat,aggfunc='sum')
		
		#normal correlation
		elif all(highchart.check_vals):
			data = data[[highchart.x,highchart.y]].set_index(highchart.x)
		
		#frame with one axes as string and other as numerical
		elif any(highchart.check_vals):
			string_axes = [highchart.x,highchart.y][highchart.check_vals.index(False)]
			numerical_axes = [highchart.x,highchart.y][highchart.check_vals.index(True)]
			data = pd.pivot_table(data,columns=[string_axes],values=numerical_axes,index=data.index)

		title = 'Correlation between {} and {}'
		highchart.title = title.format(highchart.x,highchart.y)
		data = data.fillna(0).round(2).sort_index()
		
		return data

	def agg_frame(highchart,data):
		#group every aggregate centered around the OrderID to get correct values
		grouper = [highchart.x,'OrderID']
		grouper = list(dict.fromkeys(grouper))
		
		#if date string is requested
		if highchart.date_string:
			
			#if the chosen x axis is the actual date column
			if data[highchart.x].dtypes == 'datetime64[ns]':
				data = data.set_index(highchart.x)
				data.index = data.index.strftime(highchart.date_string)
				data = data.groupby(data.index).aggregate({highchart.y:highchart.agg_type})
				title = 'sales {} {} for {}'
				highchart.title = title.format(highchart.agg_type,highchart.y,highchart.x)
			
			#axes is string and numerical, aggregate where index is set as date
			else:
				data = data.set_index('OrderDate')
				data.index = data.index.strftime(highchart.date_string)
				data = pd.pivot_table(data,index=data.index,columns=grouper,values=highchart.y,aggfunc='sum').groupby(level=0,axis=1).agg(highchart.agg_type)
				title = '{} {} for {} between {} and {}'
				highchart.title = title.format(highchart.agg_type,highchart.y,highchart.x,data.index[0],data.index[-1])
		
		#no date string, normal aggregate
		else:
			data = data.groupby(grouper).aggregate({highchart.y:'sum'}).groupby(level=0,axis=0).agg(highchart.agg_type)
			title = 'sales {} {} for {}'
			highchart.title = title.format(highchart.agg_type,highchart.y,highchart.x)
		data = data.fillna(0).round(2).sort_index()
		
		return data

	def agg_to_json(highchart,new_data):
		#series list is the array highcharts will interact with
		series = []
		
		#if there is one column, sort the values of the numerical column
		if len(new_data.columns) == 1 and highchart.x !='OrderDate':
			new_data = new_data.sort_values(highchart.y, ascending=False)
			
		#sort the columns according to whichever columns has the highest aggregate total
		else:
			new_data = new_data[new_data.sum().sort_values(ascending=False).index]
		
		#loop through the items as normal
		for i in np.arange(0,len(new_data.columns)):
			stuff = {'name':str(new_data.columns[i]),'data':[ round(col,2) for col in new_data[new_data.columns[i]]]}
			series.append(stuff)
		
		json_data = {'series':series,'title':highchart.title,'yAxis':{'title':highchart.y},'type':highchart.visual}
		xAxis = {'categories':[i for i in new_data.index],'title': {'text':new_data.index.name}}
		json_data['xAxis'] = xAxis
		return json_data
	
	def corr_to_json(highchart,new_data):
		#series list is the array highcharts will interact with
		series = []
		
		#during a categorical correlation, both axes must be numeric, so it's assumed. control to be handled from interface
		if highchart.corr_cat and all(highchart.check_vals):
			for i in new_data.columns.levels[0]:
				stuff = {'name':i ,'data':[[x[0],x[1]] for x in new_data[i][[highchart.x,highchart.y]].values if x[0] > 0 and x[1] >0]}
				series.append(stuff)
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'xAxis':{'title':{'text':highchart.x}},'yAxis':{'title':{'text':highchart.y}}}
		
		#correlative with strings as axes, correlation category is numeric
		elif highchart.corr_cat and not all(highchart.check_vals):
			#base the name of the highchart category on the numerical bin the aggregate falls in
			bool_scatter = highchart.bool_scatter(new_data)
			for i in bool_scatter['bin'].unique():
				selected = bool_scatter[bool_scatter['bin'] == i]
				data = [[i[1],i[0]] for i in selected.values]
				stuff = {'name':'{} - {}'.format(int(i.left),int(i.right)),'data':data}
				series.append(stuff)
			xAxis = {'title':{'text':highchart.x},'categories':[i for i in new_data.columns]}
			yAxis = {'title':{'text':highchart.y},'categories':[i for i in new_data.index]}
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':yAxis,'xAxis':xAxis,'legend':highchart.corr_cat}	
			
			
		
		#normal correlation
		elif all(highchart.check_vals):
			for i in np.arange(0,len(new_data.columns)):
				stuff = {'name':'{} vs {}'.format(highchart.x,highchart.y),'data':[ [i[0],i[1]] for i in new_data.reset_index().values]}
				series.append(stuff)
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':{'title':{'text':highchart.y}},'xAxis':{'title':{'text':highchart.x}}}
		
		#if one of the axes is string, then we calculate depending on the axes data type
		elif any(highchart.check_vals):
			
			if highchart.check_vals[0] == False:
				print('con 1')
				print(highchart.check_vals)
				for s,i in enumerate(new_data.columns):
					temp = [[s,x] for x in new_data[i].values if x > 0]
					series.extend(temp)
				yAxis = {'title':{'text':highchart.y}}
				xAxis = {'title':{'text':highchart.x},'categories':[i for i in new_data.columns]}
			elif highchart.check_vals[1] == False:
				print('con 2')
				print(highchart.check_vals)
				for s,i in enumerate(new_data.columns):
					temp = [[x,s] for x in new_data[i].values if x > 0]
					series.extend(temp)
				yAxis = {'title':{'text':highchart.y},'categories':[i for i in new_data.columns]}
				xAxis = {'title':{'text':highchart.x}}
			series = [{'name':'{} vs {}'.format(highchart.x,highchart.y),'data':series}]
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':yAxis,'xAxis':xAxis}
		return json_data

'''

def bool_scatter(highchart,new_data):
		#this is specifically for scatter charts with string axes to inrease size based on category
		bool_point = new_data.melt()
		bool_point = np.sort(bool_point.select_dtypes(np.number).values,axis=None)
		bool_point = pd.cut(bool_point, 4,include_lowest=True).unique()
		bool_point = {val:enum+4 for enum,val in enumerate(bool_point)}
		return bool_point

elif highchart.corr_cat and not all(highchart.check_vals):
			bool_point = highchart.bool_scatter(new_data)
			for i in np.arange(0,len(new_data.columns)):
				
				data = [{'x':int(i),'y':int(s[0]),'marker':{'symbol':'circle','radius':[item for key,item in bool_point.items() if s[1] in key][0]}} for s in enumerate(new_data[new_data.columns[i]]) if s[1] > 0 ]
				stuff = {'name':str(new_data.columns[i]),'data':data}
				series.append(stuff)
			
			xAxis = {'title':{'text':highchart.x},'categories':[i for i in new_data.columns]}
			yAxis = {'title':{'text':highchart.y},'categories':[i for i in new_data.index]}
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':yAxis,'xAxis':xAxis}	
		#normal correlation
'''
