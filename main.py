from flask import Flask, redirect, url_for, request,json,session,render_template,jsonify
import db_functions
import pymysql
import external_functions
import re

app = Flask(__name__)
app.secret_key = 'ironpond_2'

@app.route('/bi_data', methods=['GET','POST'])
def bi_data():
	#data = db_functions.sales()
	if request.method == 'POST':
		#send the form to a dictionary
		send_values = {key:val for key,val in request.form.items()}
		
		#initialize query constructor, with list from ajax request
		query = db_functions.Db_command()
		col_array = [val for key,val in send_values.items() if key in ['x_axis','y_axis','category']]
		'date_string' in send_values and col_array.append('OrderDate')
		query.db_rel(col_array)
		data = db_functions.custom_query(query.command,query.joins)
		
		#set the attributes from the data
		highchart = external_functions.Highcharts(send_values['x_axis'],send_values['y_axis'],send_values['visual'],send_values['type'])
		highchart.corr_cat = send_values['category'] if 'category' in send_values else False
		highchart.agg_type = send_values['agg_type'] if send_values['type'] == 'aggregate' else False
		highchart.date_string = send_values['date_string'] if 'date_string' in send_values else False
		
		#create the frame and array.grab the meta data for the html divs.
		new_data = highchart.corr_frame(data) if highchart.chart_type == 'correlation' else highchart.agg_frame(data)
		new_json = highchart.corr_to_json(new_data) if highchart.chart_type == 'correlation' else highchart.agg_to_json(new_data)
		#new_json['meta_data'] = meta_data
		
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
		highchart = external_functions.Highcharts('Total','Price','scatter','correlation')
		
		#for the cookies
		for_next = vars(highchart)
		
		#create the frame and json array. meta data and state for html interfacing
		new_data = highchart.corr_frame(data) if highchart.chart_type == 'correlation' else highchart.agg_frame(data)
		new_json = highchart.corr_to_json(new_data) if highchart.chart_type == 'correlation' else highchart.agg_to_json(new_data)
		
		#we need metadata for the html elements and save in cookies
		meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(data.nunique().index,data.nunique().values,data.dtypes)]
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
		highchart = external_functions.Highcharts(**for_next)
		
		#create the frame and json array. meta data and state for html interfacing
		new_data = highchart.corr_frame(data) if highchart.chart_type == 'correlation' else highchart.agg_frame(data)
		new_json = highchart.corr_to_json(new_data) if highchart.chart_type == 'correlation' else highchart.agg_to_json(new_data)
		
		#we need metadata for the html elements and save in cookies
		meta_data = [{'name':i[0],'count':int(i[1]),'dtype':i[2].name}   for i in zip(data.nunique().index,data.nunique().values,data.dtypes)]
		meta_data.reverse()
		
		new_json['meta_data'] = meta_data
		new_json['state'] = vars(highchart)
		new_json['warnings'] = session['warnings']
		return jsonify(new_json)

@app.route("/")
def bi_page():
	#session.pop('state',None)
	return render_template('index.html')

'''
@app.route('/test_heat/', methods=['GET'])
def test_heat():
	data = db_functions.sales()
	data = pd.pivot_table(data,index='ShipperName',columns='CustomerCountry',values='Total',aggfunc='sum').fillna(0)
	xAxis_categories = [i for i in data.columns]
	yAxis_categories = [i for i in data.index]
	
	print(xAxis_categories)
	
	series = []

	for col_index in np.arange(0,len(data.columns)):
		selected = data[data.columns[col_index]]
		for row_index,value in enumerate(selected.values):
			series.append([int(col_index),int(row_index),int(value)])
	
	print(series)
	new_json = {'xAxis':xAxis_categories,'yAxis':yAxis_categories,'series':series}
	
	return jsonify(new_json)
'''
@app.route("/test/")
def test():
	data = db_functions.sales()
	#htmler = data.to_html(classes='table small',header=True,index=False,col_space=1,justify='left')
	data = data.select_dtypes(include=['object','datetime64']).sort_values('OrderDate')
	data = data[data.nunique().sort_values().index]
	data = data.astype(str)
	cols = [" ".join(re.split("(^[A-Z][a-z]+|[A-Z][A-Z]+)", col)).strip() +': '+str(value) for col in data.columns for value in data[col].unique()]
	
	#data = data[data.nunique().sort_values().index]
	#cols = {i:data[i].unique().tolist() for i in data.columns}
	
	return render_template('test.html',cols=cols)
	
if (__name__ == "__main__"):
	app.run(port = 5000, debug=True)




'''
<form>
 
    <div class="input-group" style="margin-top: 20px;">
      <span class="input-group-text">Search</span>
      <input type="text" class="form-control">
    </div>
   
    <div class="input-group mt-4"  style="margin-bottom: 20px;">
      {%for index,list in cols.items()%}
        <select class="form-select">
          <option disabled selected>{{index}}</option>
          {% for value in list %}  
            <option>{{value}}</option>
          {% endfor %}
        </select>
      {%endfor%}
    </div>
  </form>

<form>
 
    <div class="input-group" style="margin-top: 20px;">
      <span class="input-group-text">Search</span>
      <input type="text" class="form-control" id="searchParam">
      <button class="btn btn-primary" id="addFilter"type="button">Add Filter</button>
    </div>
    <br>
      <ul class="nav nav-tabs" id="nav-tab" role="tablist">
        {%for index,list in cols.items()%}
        <li class="nav-item"> 
          <button class="nav-link small" id="nav-{{index}}" data-bs-toggle="tab" data-bs-target="#{{index}}" type="button" role="tab">{{index}}</button>
        </li>
        {%endfor%}
      </ul>
      <div class="tab-content" id="nav-tabContent">
        {%for index,list in cols.items()%}
          <div class="tab-pane fade" id="{{index}}" role="tabpanel">
            <table class="table table-striped table-sm" id="table-{{index}}" style="width: 100%;">
              <tbody>
                {% for value in list%}
                  <tr class="small">
                    <td style="text-align: center;">
                      {{value}}
                    </td>
                  </tr>
                {%endfor%}
              </tbody>
            </table>
          </div>
        {%endfor%}
      </div>
  </form>
  
  
   <datalist id="ice-cream-flavors" style="color: lightseagreen; width: 100%;">
        {% for i in cols%}
        <option value="{{i}}">
       
        {% endfor %}
    </datalist>
'''

