let VChart = {
  data(){
    return {
      currentTime:0,
      timeRange:60,
      historyExtremes:[],
      currentPrice:0,
      maxRange:0,
      minRange:0,
      rangeData:[[0,0,0,0]], // 周期内数据
      openPrice:"",
      openTime:0,
      chart:null,
      historyData:[],
      socketData:[],
      valueData:[],
      MA5Array:[],
      MA10Array:[],

      period:"M1",
      periods:['M1','M5','M15','M30','H1','H4','D1','W1','MN'],
    }
  },
  template:`
    <div class="chart">
      <h1>Hello Chart</h1>
      <ul class="btns_history">
        <li class="item" :class="{'current':(p==period)}" v-for="p in periods" @click.stop="console.log('click');fetchChartHistory(p)">{{p}}</li>
      </ul>
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
    historyDuring(period){
      let ct = this.currentTime;
      let loadCount=500;
      let times = [];
      switch(period){
        // case "M1":{times=[ct-loadCount-60*1000,ct];}break;
        // case "M5":{times=[ct-loadCount-5*60*1000,ct];}break;
        // case "M15":{times=[ct-loadCount-15*60*1000,ct];}break;
        // case "M30":{times=[ct-loadCount-30*60*1000,ct];}break;
        // case "H1":{times=[ct-loadCount-60*60*1000,ct];}break;
        // case "H4":{times=[ct-loadCount-240*60*1000,ct];}break;
        // case "D1":{times=[ct-loadCount-24*60*60*1000,ct];}break;
        // case "W1":{times=[ct-loadCount-7*24*60*60*1000,ct];}break;
        // case "MN":{times=[ct-loadCount-30*24*60*60*1000,ct];}break;
        case "M1":{times=[ct-loadCount-3600,ct];}break;
        case "M5":{times=[ct-loadCount-5*3600,ct];}break;
        case "M15":{times=[ct-loadCount-15*3600,ct];}break;
        case "M30":{times=[ct-loadCount-30*3600,ct];}break;
        case "H1":{times=[ct-loadCount-60*3600,ct];}break;
        case "H4":{times=[ct-loadCount-240*3600,ct];}break;
        case "D1":{times=[ct-loadCount-24*60*3600,ct];}break;
        case "W1":{times=[ct-loadCount-7*24*60*3600,ct];}break;
        case "MN":{times=[ct-loadCount-30*24*60*3600,ct];}break;
      }
      console.log(times);
      return times;
    },
    fetchChartHistory(period){
      this.period = period;
      let times = this.historyDuring(period);
      console.log("==fetchChartHistory==")
      this.fetchChartHistoryData(times[0],times[1]);
    },
    addNewCandleTick(d){
      console.log(d.t+"===add point=="+this.openTime)
      // if(d.t<this.openTime){this.fetchChartHistory(this.period);return;}
      let newData = [d.t*1000,this.openPrice,this.maxRange,this.minRange,d.b];// 只关注最后一次的收盘价
      // console.log(d.t+"===addnew point==",newData+"==="+this.openTime);
      this.chartSeries.addPoint(newData,true,true);
      this.openTime = d.t; // 不断通过update校对时间
      this.openPrice = d.b;
      this.maxRange = d.b;
      this.minRange = d.b;
    },
    updatePoint(d){
      if(!this.chartSeries){
        return;
      }
      this.currentTime=d.t;
      // console.log("===update==="+(this.openTime+this.timeRange-d.t))
      if(this.openTime+this.timeRange-d.t<1){
        this.addNewCandleTick(d);
        return;
      }
      this.maxRange = _.max([d.b,this.maxRange]);
      this.minRange = _.min([d.b,this.minRange]);
      let lastPoint = _.last(this.chartSeries.points);
      let newData = [d.t*1000,this.openPrice,this.maxRange,this.minRange,d.b];
      // console.log(d,"===updated====",newData);
      lastPoint.update(newData,true,true);
      this.currentPrice = d.b;
      let yAxis = this.chart.yAxis[0];
      // yAxis.options.plotLines[1].value = _.max([this.maxRange,this.historyExtremes[0]]);
      // yAxis.options.plotLines[2].value = _.min([this.minRange,this.historyExtremes[1]]);
      yAxis.options.plotLines[0].value = this.currentPrice;
      yAxis.options.plotLines[0].label.text = this.currentPrice;
      if(this.currentPrice-this.openPrice>0){
        yAxis.options.plotLines[0].color="green";
        // yAxis.options.plotLines[0].label.style.color="green";
      }else if(this.currentPrice-this.openPrice<0) {
        yAxis.options.plotLines[0].color="red";
        // yAxis.options.plotLines[0].label.style.color="red";
      }else{
        yAxis.options.plotLines[0].color="gray";
        // yAxis.options.plotLines[0].label.style.color="black";
      }
      yAxis.update(true);
    },
    initSocket(){
      const socket = io("//io.ubankfx.com");
      socket.on("connect",()=>{
        socket.emit("quotes:subscribe","quotes");
      });
      socket.on("quotes:init",(data)=>{
        let da = JSON.parse(data);
        // console.log("==socket init=",da);
        let initSocketData = _.filter(da,{s:"EURUSD"});
        let lastData = _.last(initSocketData);
        this.openTime = lastData.t;// 当前开盘时间
        this.openPrice = lastData.b;//初始化最近一次的卖出价为新点的开盘价
        this.maxRange = lastData.b;// 初始化最高值
        this.minRange = lastData.b; // 初始化最低值

        this.currentPrice = lastData.b;
        this.currentTime=lastData.t;
        // console.log(this.openTime,"====111==",this.rangeData);
        console.log("===sofcket init")
        // 获取到服务器时间后，根据服务器时间初始化历史记录
        this.fetchChartHistory(this.period);

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
          // useUTC: false,
          // timezone:'Europe/Oslo'
          // getTimezoneOffset:function(timestamp){
          //   var zone = 'Europe/Oslo';
          //   zone="EET";
          //   var timezoneOffset = -moment.tz(timestamp, zone).utcOffset();
          //   console.log(timezoneOffset);
          //   return timezoneOffset;
          // }
        },
        lang: {
          noData: "No Data"
        }
      } );
      // create the chart
      const options = {
        height:'100%',
        chart:{
          events:{
            load: function(){
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
          },
        },
        credits: {
          enabled: false,
        },
        navigator: {
          enabled: false,
        },
        scrollbar:{
          enabled:false,
        },
        navigation:{
          enabled:false,
        },
        tooltip:{
          borderWidth:0,
          shadow:false,
          pointFormatter:function(){
            return this.series.name+" O:"+this.open+" H:"+this.high+" L:"+this.low+" C:"+this.close;
          },
          positioner: function () {
            return { x: 0, y: 0 };
          },
        },
        rangeSelector: {
          enabled: false,
          selected: 0,
          inputEnabled: false,
        },
        xAxis: {
          // minPadding:0,
          // maxPadding:0,
          // tickLength:0,
          // ordinal:false,
          // startOnTick:true,
          // endOnTick:true,
          crosshair: {
            label: {
              formatter: function (e) {
                return Highcharts.dateFormat("%Y-%m-%d %H:%M:%S", e);
              },
              enabled: true,
              borderWidth: 1,
            }
          },
          dateTimeLabelFormats:{
            millisecond: '%H:%M:%S',
          	second: '%M:%S',
          	minute: '%H:%M',
          	hour: '%H:%M',
          	day: '%e. %b',
          	week: '%e. %b',
          	month: '%Y %b \'%y',
          	year: '%Y'
          }
        },
        yAxis: [ {
          height:'100%',
          showLastLabel:true,
          showFirstLabel:false,
          minorTickInte3rval:"auto",
          gridLineDashStyle:"longdash",
          gridLineColor: '#666',
          gridLineWidth: 1,
          offset:40,
          plotLines: [
            {
              value: this.currentPrice,
              color: 'gray',
              width: 1,
              label:{
                align:"right",
                fontSize:"14px",
                text:this.currentPrice
              },
              zIndex:5,
            }
          ],

          crosshair: {
            label: {
              enabled: true,
              borderWidth: 1,
            }
          },
          showLastLabel: true, //是否显示最后一个轴标签
        },
        ],
        series: [ {
            type: 'candlestick',
            data: this.historyData,
            dataGrouping:{
              enableds:false,
            },
            yAxis:0,
            dataLabels:{
              enabled: true,
              shadow:true,
              style:{
                fontWeight: 'bold'
              },
              // verticalAlign:'bottom',
              formatter:function(){
                // console.log("===point==",this);
                if(this.point.high===this.point.series.dataMax){
                  return '<span style="color: red;">High:' + this.point.high + '</span>';
                }else if(this.point.low===this.point.series.dataMin) {
                  return '<span style="color: green;">Low:' + this.point.low + '</span>';
                }
              }
            },
          }
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
      this.chart = new Highcharts.stockChart( "chartId", options);
    },
    fetchChartHistoryData(st,et){
      console.log("=fetchChartHistoryData====")
      // m1为1小时数据
      // let url = '//io.ubankfx.com/chart?from='+(this.openTime-3600)+'&to='+this.openTime+'&symbol=EURUSD&period=M1';
      let url = '//io.ubankfx.com/chart?from='+st+'&to='+et+'&symbol=EURUSD&period='+this.period;
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
