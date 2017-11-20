let VChart = {
  data(){
    return {
      updateData:[],
      timeRange:60,
      timer:null,
      historyExtremes:[],
      currentPrice:0,
      isUpdating:false,
      maxRange:0,
      minRange:0,
      rangeData:[[0,0,0,0]], // 周期内数据
      openPrice:"",
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
      <p>Max:{{historyExtremes[0]}}</p>
      <p>Min:{{historyExtremes[1]}}</p>
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
      return this.chartSeries.points;
    }
  },
  methods:{
    updateTimer(){
      this.currentTime++;
      let countTime = (this.timeRange-moment.unix(this.currentTime).seconds())
      console.log(this.currentTime+"===update timer=="+moment.unix(this.currentTime).seconds()+"=="+countTime);
      if(!this.isUpdating){return;}
      if(countTime==this.timeRange){
        let newData = [this.updateData.t*1000,this.openPrice,this.maxRange,this.minRange,this.updateData.b];// 只关注最后一次的收盘价
        console.log("==add point==",newData)
        this.chartSeries.addPoint(newData,true,true);
        this.maxRange = this.updateData.b;
        this.minRange = this.updateData.b;
        this.isUpdating = false;
        this.currentPrice = this.updateData.b;
        this.currentTime=this.updateData.t;
      }
    },
    updatePoint(d){
      if(!this.chartSeries){
        return;
      }
      if(!this.isUpdating){
        this.openPrice = d.b;
      }
      this.updateData=d;
      this.isUpdating = true;
      this.maxRange = _.max([d.b,this.maxRange]);
      this.minRange = _.min([d.b,this.minRange]);
      // this.rangeData.push([d.a,d.b]); // 收集时段内极限数据
      let lastPoint = _.last(this.chartSeries.points);
      let newData = [d.t*1000,this.openPrice,this.maxRange,this.minRange,d.b];
      // console.log(d,"===updated====",newData);
      lastPoint.update(newData,true,true);
      this.currentPrice = d.b;
      let yAxis = this.chart.yAxis[0];
      yAxis.options.plotLines[0].value = _.max([this.maxRange,this.historyExtremes[0]]);
      yAxis.options.plotLines[1].value = _.min([this.minRange,this.historyExtremes[1]]);
      yAxis.options.plotLines[2].value=this.currentPrice;
      yAxis.update(true);
    },
    initSocket(){
      const socket = io("//dev.io.ubankfx.com");
      socket.on("connect",()=>{
        socket.emit("quotes:subscribe","quotes");
      });
      socket.on("quotes:init",(data)=>{
        let da = JSON.parse(data);
        // console.log("==socket init=",da);
        let initSocketData = _.filter(da,{s:"EURUSD"});
        let lastData = _.last(initSocketData);
        this.currentTime = lastData.t;// 当前时间
        // this.rangeData = [[lastData.a,lastData.b]];// 初始化ohlc数据
        this.openPrice = lastData.b;//初始化最近一次的卖出价为新点的开盘价
        // this.maxRange = lastData.a;
        this.minRange = lastData.b;

        this.currentPrice = lastData.b;
        // console.log(this.currentTime,"====111==",this.rangeData);
        // 获取到服务器时间后，根据服务器时间初始化历史记录
        this.fetchChartHistoryData();

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
          events:{
            load: function(){
              if(that.timer){
                clearInterval(that.timer);
              }
              that.timer = setInterval(that.updateTimer,1e3)
              // 图表加载完后应该追加一点为当前周期变化点
              if(moment.unix(that.currentTime).seconds()==60){
                let newPoint = _.concat(that.currentTime*1000,[that.openPrice,that.openPrice,that.openPrice,that.openPrice]);
                // console.log("===new point=",newPoint);
                this.series[0].addPoint(newPoint);
              }
            }
          }
        },
        plotOptions:{
          //修改蜡烛颜色
  	    	candlestick: {
            upLineColor:"green",
            upColor:"green",
            lineColor:"red",
            color:"red",
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
          minPadding:0,
          maxPadding:0,
          crosshair:true,
          // labels:{
          //   formatter:function(){
          //     console.log("=="+moment.unix(this.value).toISOString());
          //     return moment(moment.unix(this.value).toISOString()).format("HH:mm");
          //   }
          // }
        },
        yAxis: [ {
          events:{
            afterSetExtremes:function(){

            }
          },
          height:'100%',
          showLastLabel:true,
          showFirstLabel:false,
          minorTickInte3rval:"auto",
          gridLineDashStyle:"longdash",
          gridLineColor: '#666',
          gridLineWidth: 1,
          plotLines: [ {
            value: this.historyExtremes[0],
            color: 'green',
            dashStyle: "shortdash",
            width: 2,
          }, {
            value: this.historyExtremes[1],
            color: 'red',
            dashStyle: "shortdash",
            width: 2,
          },{
            value: this.currentPrice,
            color: 'gray',
            width: 1,
          } ],
        },
        ],
        series: [ {
            type: 'candlestick',
            data: this.historyData,
            dataGrouping:{
              enableds:false,
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
      let url = 'http://dev.io.ubankfx.com/chart?from='+(this.currentTime-3600)+'&to='+this.currentTime+'&symbol=EURUSD&period=M1';
      this.$http.get(url).then((resp)=>{
        this.historyData = _.map(resp.body.data,(v,k)=>{
          // time, open, high, low, close
          return [v.ot*1000,v.op,v.hp,v.lp,v.cp];
        });

        let historyHigh = [],historyLow=[];
        _.map(this.historyData,(v,k)=>{
          historyHigh.push(v[2]);
          historyLow.push(v[3]);
        });
        this.historyExtremes = [_.max(historyHigh),_.min(historyLow)];
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
