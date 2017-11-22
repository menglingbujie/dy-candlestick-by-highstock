let VChart = {
  data(){
    return {
      productName:"EURUSD",
      currentTime:0,
      timeRange:60,
      currentPrice:0,
      maxRange:0,
      minRange:0,
      openPrice:"",
      openTime:0,
      chart:null,
      historyData:[],
      valueData:[], // 交易量数据
      MA5Array:[],// ma5数据
      MA10Array:[],// ma10数据
      page:1, //当前页
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
      <div class="btn_group">
        <button class="btn prev" @click.stop="historyPrev">上一页</button>
        <button class="btn next" @click.stop="historyNext">下一页</button>
      </div>
      <div id="chartId"></div>
    </div>
  `,
  created() {
    this.initSocket();
  },
  computed:{
    periodTimes(){
      // 根据历史数据获得要推迟的时间段
      return (this.page-1)*this.periodRange;
    },
    historyDuring(){
      // 请求数据所需要的st和et区间
      return [this.currentTime-this.periodRange-this.periodTimes,this.currentTime-this.periodTimes];
    },
    periodRange(){
      // 获取每个时间段取值范围
      switch(this.period){
        case "M1":{return 3600;}break;
        case "M5":{return 5*3600;}break;
        case "M15":{return 15*3600;}break;
        case "M30":{return 30*3600;}break;
        case "H1":{return 60*3600;}break;
        case "H4":{return 240*3600;}break;
        case "D1":{return 24*60*3600;}break;
        case "W1":{return 7*24*60*3600;}break;
        case "MN":{return 30*24*60**3600;}break;
      }
    },
    chartSeries(){
      return this.chart&&this.chart.series[0];
    },
    points(){
      return this.chartSeries.points;
    }
  },
  methods:{
    historyNext(){
      this.page--;
      if(this.page<1){
        this.page=1;
        return;
      }
      // 全部往前移动一个周期
      let st = this.historyDuring[0];
      let et = this.historyDuring[1];
      this.fetchChartHistoryData(st,et);
    },
    historyPrev(){
      this.page++;
      // 全部往前移动一个周期
      let st = this.historyDuring[0];
      let et = this.historyDuring[1];
      this.fetchChartHistoryData(st,et);
    },
    fetchChartHistory(period){
      this.period = period;
      this.fetchChartHistoryData(this.historyDuring[0],this.historyDuring[1]);
    },
    addNewCandleTick(d){
      console.log(d,"===add point=="+this.openTime+"==="+(this.openTime-d.t))
      this.openTime+=this.timeRange;
      // let newData = [this.openTime*1000,this.openPrice,this.maxRange,this.minRange,d.b];// 只关注最后一次的收盘价
      let newData = [this.openTime*1000,d.a,this.maxRange,this.minRange,d.b];// 只关注最后一次的收盘价
      // console.log(d.t+"===addnew point==",newData+"==="+this.openTime);
      this.chartSeries.addPoint(newData,true,true);
      this.openPrice = d.b;
      this.maxRange = d.b;
      this.minRange = d.b;
    },
    updatePoint(d){
      if(!this.chartSeries){
        return;
      }
      this.currentTime=d.t;
      console.log(d,"===update==="+(this.openTime+this.timeRange-d.t)+"=="+this.timeRange)
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
      const socket = io("//io.ubankfx.cn");
      socket.on("connect",()=>{
        socket.emit("quotes:subscribe","quotes");
      });
      socket.on("quotes:init",(data)=>{
        let da = JSON.parse(data);
        // console.log("==socket init=",da);
        let initSocketData = _.filter(da,{s:this.productName});
        let lastData = _.last(initSocketData);
        this.openTime = lastData.t;// 当前开盘时间
        this.openPrice = lastData.b;//初始化最近一次的卖出价为新点的开盘价

        this.currentPrice = lastData.b;
        this.currentTime=lastData.t;
        this.maxRange = lastData.b;
        this.minRange = lastData.b;
        // 获取到服务器时间后，根据服务器时间初始化历史记录
        this.fetchChartHistory(this.period);

      })
      socket.on("quotes:update",(data)=>{
        let d = JSON.parse(data);
        if(d.s!=this.productName)return;
        if(this.page==1){
          this.updatePoint(d);
        }
      });
    },
    initChart(){
      let that = this;
      Highcharts.setOptions( {
        global: {
          useUTC: true,
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
          zoomType:"none",
          pinchType:"none",
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
            millisecond: '%H:%M',
          	second: '%H:%M',
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
      // m1为1小时数据
      let url = '//io.ubankfx.cn/chart?from='+st+'&to='+et+'&symbol='+this.productName+'&period='+this.period;
      this.$http.get(url).then((resp)=>{
        let _data = resp.body.data&&_.sortBy(resp.body.data,['ot'])
        this.historyData = _.map(_data,(v,k)=>{
          // time, open, high, low, close
          return [v.ot*1000,v.op,v.hp,v.lp,v.cp];
        });
        // 如果有chart对象就update否则就初始化chart表
        if(!this.chart){
          this.initChart();
        }else{
          this.chartSeries.update({data:this.historyData},true);
        }
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
