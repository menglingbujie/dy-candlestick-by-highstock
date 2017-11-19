let VChart = {
  data(){
    return {
      oldSellPrice:"",
      updateData:[0,0,0,0], // 实时数据，统计用
      currentTime:0,
      chart:null,
      historyData:[],
      socketData:[],
      valueData:[],
      MA5Array:[],
      MA10Array:[],
    }
  },
  template:`
    <div class="chart">
      <h1>Hello Chart</h1>
      <p>Min {{minSell}}</p>
      <p>Max {{maxSell}}</p>
      <div id="chartId"></div>
    </div>
  `,
  created() {
    this.initSocket();
  },
  computed:{
    chartSeries(){
      return this.chart&&this.chart.series[0];
    },
    points(){
      return this.chart.series[0].points;
    },
    maxSell(){
      if(!this.chart){return 0;}
      return this.chart.series[0].dataMax;
    },
    minSell(){
      if(!this.chart){return 0;}
      return this.chart.series[0].dataMin;
    },
  },
  methods:{
    updatePoint(d){
      // console.log(d.t+"==="+this.currentTime+"=="+(d.t-this.currentTime))
      if(d.t-this.currentTime>=60){
        let newData = [d.t*1000,d.a,this.updateData[1],this.updateData[2],d.b];
        console.log("==add point==",newData)
        this.chartSeries.addPoint(newData,true,true);
        this.currentTime = d.t; // 更新当前时间
        this.updateData = [d.a,d.a,d.b,d.b];
        this.oldSellPrice = d.b;
      }else{
        let lastPoint = _.last(this.chartSeries.points);
        this.updateData[0]= d.a;
        this.updateData[3]= d.b;
        let maxV = _.max([this.oldSellPrice,d.b,this.updateData[1]]);// 周期内最高值
        let minV = _.min([this.oldSellPrice,d.b,this.updateData[2]]);// 周期内最低值
        this.updateData[1]= maxV;
        this.updateData[2]= minV;
        let newData = [d.t*1000,this.oldSellPrice,maxV,minV,d.b];
        console.log("===updated====",newData);
        lastPoint.update(newData,true,true);
        this.chartSeries.redraw();
      }
    },
    initSocket(){
      const socket = io("//dev.io.ubankfx.com");
      socket.on("connect",()=>{
        socket.emit("quotes:subscribe","quotes");
      });
      socket.on("quotes:init",(data)=>{
        let da = JSON.parse(data);
        console.log("==socket init=",da);
        let initSocketData = _.filter(da,{s:"EURUSD"});
        let lastData = _.last(initSocketData);
        this.currentTime = lastData.t;// 当前时间
        this.updateData = [lastData.a,lastData.a,lastData.b,lastData.b];// 初始化ohlc数据
        this.oldSellPrice = lastData.b;//初始化最近一次的卖出价

        // console.log(this.currentTime,"====111==",this.updateData);
        // 获取到服务器时间后，根据服务器时间初始化历史记录
        this.fetchChartHistoryData();

      })
      socket.on("quotes:update",(data)=>{
        console.log("==socket update=",data);
        let d = JSON.parse(data);
        if(d.s!="EURUSD")return;
        this.updatePoint(d);
      });
    },
    initChart(){
      let that = this;
      Highcharts.setOptions( {
        global: {
          useUTC: false
        },
        lang: {
          noData: "No Data"
        }
      } );
      // create the chart
      const options = {
        height:'100%',
        chart:{
          margin: [30, 30,30, 30],
    			plotBorderColor: '#3C94C4',
    			plotBorderWidth: 0.3,
          backgroundColor:"#000",
          events:{
            load: function(){
              // 图表加载完后应该追加一点为当前周期变化点
              let newPoint = _.concat(that.currentTime*1000,[that.oldSellPrice,that.oldSellPrice,that.updateData[2],that.updateData[3]]);
              // newPoint[1]=that.oldSellPrice; // 新蜡烛图的open价为上一个蜡烛图的close价
              console.log("===new point=",newPoint);
              this.series[0].addPoint(newPoint);
            }
          }
        },
        plotOptions:{
          //修改蜡烛颜色
  	    	candlestick: {
            upLineColor:"green",
            upColor:"none",
            lineColor:"green",
            color:"white",
            dataGrouping:{
              enabled:false,
            },
  	    		maker:{
  	    			states:{
  	    				hover:{
  	    					enabled:false,
  	    				}
  	    			}
  	    		}
  	    	},
  	    	//去掉曲线和蜡烛上的hover事件
          series: {
          	states: {
              hover: {
                  enabled: false
              }
            },
            line: {
              marker: {
                enabled: false
              }
            }
          }
        },
        credits: {
          enabled: false,
        },
        navigator: {
          enabled: true,
        },
        rangeSelector: {
          enabled: false,
          selected: 0,
          inputEnabled: false,
        },
        scrollbar:{
          enabled: true,
        },
        xAxis: {
          // type: 'datetime',
          // minRange:5000,
          minPadding:0,
          maxPadding:0,
          // dateTimeLabelFormats: {
          //   second: '%H:%M:%S',
          //   minute: '%m-%d %H:%M',
          //   hour: '%m-%d %H:%M',
          //   day: '%m-%d %Y',
          //   week: '%m-%d %Y',
          //   month: '%Y-%m',
          //   year: '%Y'
          // }
        },
        yAxis: [ {
            height: '80%',
            showLastLabel:true,
            showFirstLabel:false,
            minorTickInte3rval:"auto",
            gridLineDashStyle:"longdash",
            gridLineColor: '#666',
            gridLineWidth: 1,
            // offset:40,
            // plotLines: [ {
            //   value: this.minRate,
            //   color: 'green',
            //   dashStyle: "shortdash",
            //   width: 2,
            // }, {
            //   value: this.maxRate,
            //   color: 'red',
            //   dashStyle: "shortdash",
            //   width: 2,
            // } ],
          },
          {
            height:"15%",
            top:"85%"
          }
        ],
        series: [ {
            type: 'candlestick',
            // type: 'ohlc',
            data: this.historyData,
            dataGrouping:{
              enableds:false,
              // forced:true,
              // units:[
              //   ["minute",[1,5,15,30]],
              //   ["hour",[1,4]],
              //   ['day',[1]],
              //   ['week',[1]],
              //   ['month',[1]],
              //   ['year',[1]],
              // ],
            },
            yAxis:0,
          },
          // {
  	      //   type: 'spline',
  	      //   name: 'MA5',
  	      //   data: this.MA5Array,
  	      //   color:'#8bbc21',
  	      //   threshold: null,
  	      //   lineWidth:1,
  	      //   dataGrouping: {
    			// 	  enabled: false
    			//   }
          // },
          // {
  	      //   type: 'spline',
  	      //   name: 'MA10',
  	      //   data: this.MA10Array,
  	      //   color:'#8bbc21',
  	      //   threshold: null,
  	      //   lineWidth:1,
  	      //   dataGrouping: {
    			// 	  enabled: false
    			//   }
          // }
        ]
      }
      this.chart = new Highcharts.stockChart( "chartId", options );
    },
    fetchChartHistoryData(){
      // m1为6小时数据
      //this.$http.get('http://dev.io.ubankfx.com/chart?from='+(this.currentTime-21600)+'&to='+this.currentTime+'&symbol=EURUSD&period=M1').then((resp)=>{
      this.$http.get('http://dev.io.ubankfx.com/chart?from='+(this.currentTime-3600)+'&to='+this.currentTime+'&symbol=EURUSD&period=M1').then((resp)=>{
        // console.log("====",resp.body.data)
        this.historyData = _.map(resp.body.data,(v,k)=>{
          // time, open, high, low, close
          return [v.ot*1000,v.op,v.hp,v.lp,v.cp];
        });

        this.initChart();
      });
    }
  }
}

let app = new Vue({
  components:{
    vchart:VChart
  }
})
app.$mount("#root");
