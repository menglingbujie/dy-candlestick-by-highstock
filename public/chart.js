let VChart = {
  data(){
    return {
      oldBuyPrice:"",
      updateData:[], // 实时数据，统计用
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
    this.fetchChartHistoryData();
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
      this.updateData.push(d);
      // console.log(d.t+"==="+this.currentTime+"=="+(d.t-this.currentTime))
      if(d.t-this.currentTime>=60){
        let newData = [d.t*1000,d.b,_.maxBy(this.updateData,function(o){return o.b;}).b,_.minBy(this.updateData,function(o){return o.a}).a,d.a];
        console.log("==add point==",newData)
        // this.chartSeries.addPoint(newData,true,true);
        this.currentTime = d.t; // 更新当前时间
        this.updateData = [];
        this.oldBuyPrice = d.b;
      }else{
        let lastPoint = _.last(this.chartSeries.points);
        let newData = [d.t*1000,this.oldBuyPrice,_.maxBy(this.updateData,function(o){return o.b;}).b,_.minBy(this.updateData,function(o){return o.a}).a,d.a];
        console.log("==update point==",newData)
        lastPoint.update(newData);
        // this.chartSeries.redraw();
      }
      // let lastHistoryData = _.last(that.historyData);
      // let oldH = lastHistoryData[2];
      // let oldL = lastHistoryData[3];
      // let oldBuyPrice = lastHistoryData[1];
      // console.log("===",that.historyData)
      // console.log("--",series);
      // setInterval(()=>{
      //   count++;
      //   let t= (new Date()).getTime();
      //   let r = _.random(0,that.historyData.length-1);
      //   let rData = that.historyData[r];
      //
      //   let lastPoint = _.last(series.points);
      //   let newData = [t,oldBuyPrice,_.max([rData[2],oldH]),_.min([rData[3],oldL]),rData[4]];
      //   // console.log("==",newData);
      //   lastPoint.update(newData);
      //   if(count>=10){
      //     count=0;
      //     oldH = newData[2];
      //     oldL = newData[3];
      //     oldBuyPrice = newData[1];
      //     series.addPoint(newData,true,true);
      //   }
      // },1e3)
    },
    initSocket(){
      const socket = io("//dev.io.ubankfx.com");
      socket.on("connect",()=>{
        socket.emit("quotes:subscribe","quotes");
      });
      socket.on("quotes:init",(data)=>{
        let da = JSON.parse(data);
        let initSocketData = _.filter(da,{s:"EURUSD"});
        // let maxData = _.maxBy(initSocketData,function(o){return o.b;})
        let lastData = _.last(initSocketData);
        // console.log("===lag-=",lastData)
        let lastHistoryData = _.last(this.historyData);
        // console.log(this.historyData,"=-===",lastHistoryData)
        this.oldBuyPrice = lastHistoryData[4]
        let newPoint = [lastData.t*1000,this.oldBuyPrice,_.max(this.oldBuyPrice,lastData.b),_.min(this.oldBuyPrice,lastData.a),lastData.a];
        // console.log("===11==",this.historyData)
        // console.log(lastHistoryData,"===",newPoint)
        this.historyData.push(newPoint);
        // console.log("==22==",this.historyData);
        this.initChart();

        this.currentTime = lastData.t;// 当前时间
      })
      socket.on("quotes:update",(data)=>{
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
              // let series = this.series[0];
              // let lastHistoryData = _.last(that.historyData);
              // let oldH = lastHistoryData[2];
              // let oldL = lastHistoryData[3];
              // let oldBuyPrice = lastHistoryData[1];
              // let count = 0;
              // console.log("===",that.historyData)
              // console.log("--",series);
              // setInterval(()=>{
              //   count++;
              //   let t= (new Date()).getTime();
              //   let r = _.random(0,that.historyData.length-1);
              //   let rData = that.historyData[r];
              //
              //   let lastPoint = _.last(series.points);
              //   let newData = [t,oldBuyPrice,_.max([rData[2],oldH]),_.min([rData[3],oldL]),rData[4]];
              //   // console.log("==",newData);
              //   lastPoint.update(newData);
              //   if(count>=10){
              //     count=0;
              //     oldH = newData[2];
              //     oldL = newData[3];
              //     oldBuyPrice = newData[1];
              //     series.addPoint(newData,true,true);
              //   }
              // },1e3)
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
          enabled: false,
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
      let _currTime = Math.floor((new Date()).getTime()/1000);
      this.$http.get('http://dev.io.ubankfx.com/chart?from='+(_currTime-43200)+'&to='+_currTime+'&symbol=EURUSD&period=M1').then((resp)=>{
        // console.log("====",resp.body.data)
        this.historyData = _.map(resp.body.data,(v,k)=>{
          // time, open, high, low, close
          return [v.ot*1000,v.op,v.hp,v.lp,v.cp];
        });
        // this.MA5Array = _.map(resp.body.data,(v,k)=>{
        //   return [v.ot,v.cp];
        // });
        //
        // this.MA10Array = _.map(resp.body.data,(v,k)=>{
        //   return [v.ot,v.op];
        // });

        this.initSocket();
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
