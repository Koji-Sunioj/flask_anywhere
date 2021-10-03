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
		
		steps = 5
		divisible = 100 / steps
		steps = np.arange(0,100,step=divisible,dtype=int)
		steps = np.append(steps,100)
		cutter = [np.percentile(bool_point['value'].dropna(), perc) for perc in steps]
		
		#we need to check if the cut array is only several digits long, in which case the highchart category is just the digit
		test_sparse = np.diff(bool_point['value'].dropna().unique())
		labels = None
		
		#if there is only two numbers, meaning one category, add zero
		if len(test_sparse) == 1 and test_sparse[0] == 1:
			labels = np.unique(cutter)
			cutter.append(0)
		
		bool_point['bin'] = pd.cut(bool_point['value'],bins=np.unique(cutter),include_lowest=True,labels=labels)
		bool_point = bool_point.dropna().sort_values('bin')
		
		return bool_point
		
		
	def corr_frame(highchart,data):
		#from the correlative perspective, date should just be a string
		data['OrderDate'] = data['OrderDate'].astype(str)
		
		#boolean list to be used later: checks which axes are numerical
		test = [data.reset_index()[highchart.x].dtype.name,data.reset_index()[highchart.y].dtype.name]
		highchart.check_vals = {'bools':[i not in ['object','datetime64[ns]'] for i in test],'test':test}
		
		#if there is correlativate categoy, and both axes are numerical: make a pivot table with top index as column, followed by numerics
		if highchart.corr_cat and all(highchart.check_vals['bools']):
			data = pd.pivot_table(data,index=data.index,values=[highchart.x,highchart.y],columns=[highchart.corr_cat]).swaplevel(0, 1, axis=1).sort_index(axis=1)
		
		#dataframe with string columns as axes
		elif highchart.check_vals['test'] == ['object','object']:
			value = highchart.corr_cat if highchart.corr_cat else 'OrderID'
			aggregate = 'sum' if highchart.corr_cat else 'nunique'
			data = pd.pivot_table(data,columns=highchart.x,index=highchart.y,values=value,aggfunc=aggregate)
			
		#normal correlation
		elif all(highchart.check_vals['bools']):
			data = data[[highchart.x,highchart.y]].set_index(highchart.x)
		
		#frame with one axes as string and other as numerical
		elif any(highchart.check_vals['bools']):
			string_axes = [highchart.x,highchart.y][highchart.check_vals['bools'].index(False)]
			numerical_axes = [highchart.x,highchart.y][highchart.check_vals['bools'].index(True)]
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
		#highcharts uses aggregate data as series, as opposed to scatter with two points
		#therefore strings will only be employed on the x axis with y axis for numerical aggregates
		
		#series list is the array highcharts will interact with
		series = []
		
		#if there is one column, sort the values of the numerical column
		if len(new_data.columns) == 1 and highchart.x !='OrderDate':
			new_data = new_data.sort_values(highchart.y, ascending=False)
			
		#sort the columns according to whichever columns has the highest aggregate total
		else:
			new_data = new_data[new_data.sum().sort_values(ascending=False).index]
		
		
		#loop through the items as normal. scatter chart does not include zeros, otherwise the chart is cluttered
		for i in np.arange(0,len(new_data.columns)):
			if highchart.visual == 'scatter':
				stuff = {'name':str(new_data.columns[i]),'data':[round(col,2) if col > 0  else 'null' for col in new_data[new_data.columns[i]] ]}
			else:
				stuff = {'name':str(new_data.columns[i]),'data':[round(col,2) for col in new_data[new_data.columns[i]] ]}
			series.append(stuff)
			
		json_data = {'series':series,'title':highchart.title,'yAxis':{'title':highchart.y},'type':highchart.visual}
		xAxis = {'categories':[i for i in new_data.index],'title': {'text':new_data.index.name,'style':{'fontSize':'2px'}}}
		json_data['xAxis'] = xAxis
		return json_data
	
	def corr_to_json(highchart,new_data):
		#series list is the array highcharts will interact with
		series = []
		
		#during a categorical correlation, both axes must be numeric, so it's assumed. control to be handled from interface
		if highchart.corr_cat and all(highchart.check_vals['bools']):
			for i in new_data.columns.levels[0]:
				stuff = {'name':i ,'data':[[x[0],x[1]] for x in new_data[i][[highchart.x,highchart.y]].values if x[0] > 0 and x[1] >0]}
				series.append(stuff)
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'xAxis':{'title':{'text':highchart.x}},'yAxis':{'title':{'text':highchart.y}}}
		
		#correlative with strings as axes, correlation category is numeric
		elif highchart.check_vals['test'] == ['object','object']:
			#base the name of the highchart category on the numerical bin the aggregate falls in
			bool_scatter = highchart.bool_scatter(new_data)
			for cat in bool_scatter['bin'].unique():
				selected = bool_scatter[bool_scatter['bin'] == cat]
				data = [[axes[1],axes[0]] for axes in selected.values]
				#if the cut is only several digits, highchart category is the digit, not the range
				if type(cat).__name__ == 'float':
					stuff = {'name':cat,'data':data}
				else:
					stuff = {'name':'{} - {}'.format(f'{round(cat.left):,}',f'{round(cat.right):,}'),'data':data}
				series.append(stuff)
			xAxis = {'title':{'text':highchart.x},'categories':[i for i in new_data.columns]}
			yAxis = {'title':{'text':highchart.y},'categories':[i for i in new_data.index]}
			legend = highchart.corr_cat if highchart.corr_cat else 'Orders'
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':yAxis,'xAxis':xAxis,'legend':legend}	
			
		#normal correlation
		elif all(highchart.check_vals['bools']):
			for i in np.arange(0,len(new_data.columns)):
				stuff = {'name':'{} vs {}'.format(highchart.x,highchart.y),'data':[ [i[0],i[1]] for i in new_data.reset_index().values]}
				series.append(stuff)
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':{'title':{'text':highchart.y}},'xAxis':{'title':{'text':highchart.x}}}
		
		#if one of the axes is string, then we calculate depending on the axes data type
		elif any(highchart.check_vals['bools']):
			if highchart.check_vals['bools'][0] == False:
				for s,i in enumerate(new_data.columns):
					temp = [[s,x] for x in new_data[i].values if x > 0]
					series.extend(temp)
				yAxis = {'title':{'text':highchart.y}}
				xAxis = {'title':{'text':highchart.x},'categories':[i for i in new_data.columns]}
			elif highchart.check_vals['bools'][1] == False:
				for s,i in enumerate(new_data.columns):
					temp = [[x,s] for x in new_data[i].values if x > 0]
					series.extend(temp)
				yAxis = {'title':{'text':highchart.y},'categories':[i for i in new_data.columns]}
				xAxis = {'title':{'text':highchart.x}}
			series = [{'name':'{} vs {}'.format(highchart.x,highchart.y),'data':series}]
			json_data = {'series':series,'title':highchart.title,'type':highchart.visual,'yAxis':yAxis,'xAxis':xAxis}
		return json_data
