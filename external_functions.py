import pandas as pd
import datetime
import numpy as np

def translate_data(data,date_string,column_name,agg_target,agg_type,visual,accum=False):
	data.index = data.index.strftime(date_string)
	data = pd.pivot_table(data,index=data.index,columns=[column_name],values=agg_target,aggfunc=agg_type).fillna(0)
	
	series = []
	data = data[data.sum().sort_values(ascending=False).index]
	for i in np.arange(0,len(data.columns)):
		stuff = {'name':data.columns[i],'data':[ round(i,2)  for i in data[data.columns[i]]],'type':visual}
		series.append(stuff)
	
	xAxis = {'categories':[i for i in data.index],'title':data.index.name}
	json_data = {'series':series,'xAxis':xAxis}
	
	return json_data
    




'''
#stuff = {'name':data.columns[i],'data':[ round(i,2) if i > 0 else 'null' for i in data[data.columns[i]]],'type':'line'}
'''
