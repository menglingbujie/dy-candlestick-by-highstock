
// let Highcharts = require("highchart");
// import Highcharts from "highchart";
let VChart = {
  data(){
    return {
      newestRange:[0,0],
      rangeSelect:0,
      isUpdating:true, // 图表更新开关
      inProgress:false,
      volumnData:[],
      maset:[5,10,20],
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
      MA:[],// 移动平均线数据
      period:"M1",
      periods:['M1','M5','M15','M30','H1','H4','D1','W1','MN'],
    }
  },
  template:`
    <div class="chart">
      <strong class='title'>{{this.productName}}</strong>
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
    periodRange(){
      let pointSize = 600;
      // 获取每个时间段取值范围
      switch(this.period){
        case "M1":{this.rangeSelect=0;this.timeRange=60;return pointSize*60;}break;
        case "M5":{this.rangeSelect=1;this.timeRange=5*60;return pointSize*5*60;}break;
        case "M15":{this.rangeSelect=2;this.timeRange=15*60;return pointSize*15*60;}break;
        case "M30":{this.rangeSelect=3;this.timeRange=30*60;return pointSize*30*60;}break;
        case "H1":{this.rangeSelect=4;this.timeRange=60*60;return pointSize*60*60;}break;
        case "H4":{this.rangeSelect=5;this.timeRange=4*60*60;return pointSize*240*60;}break;
        case "D1":{this.rangeSelect=6;this.timeRange=24*60*60;return pointSize*24*60*60;}break;
        case "W1":{this.rangeSelect=7;this.timeRange=7*24*60*60;return pointSize*7*24*60*60;}break;
        case "MN":{this.rangeSelect=8;this.timeRange=30*24*60*60;return pointSize*30*24*60*60;}break;
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
    gotoNewestExtreme(){
      this.chart.xAxis[0].setExtremes(this.newestRange[0],this.newestRange[1],true,false); // 有socket更新就设置到最新极限区间
    },
    fetchChartHistory(period){
      this.period = period;
      this.fetchChartHistoryData();
    },
    addNewCandleTick(d){
      // console.log(d,"===add point=="+this.openTime+"==="+(this.openTime-d.t))
      this.openTime+=this.timeRange;
      // let newData = [this.openTime*1000,this.openPrice,this.maxRange,this.minRange,d.b];// 只关注最后一次的收盘价
      let newData = [this.openTime*1000,d.a,this.maxRange,this.minRange,d.b];// 只关注最后一次的收盘价
      // console.log(d.t+"===addnew point==",newData+"==="+this.openTime);
      // this.chartSeries.addPoint(newData,true,true);
      if(this.historyData.length>=1000){
        this.fetchChartHistoryData();
      }else{
        this.historyData.push(newData);
        this.chartSeries.setData(this.historyData);
      }

      this.openPrice = d.b;
      this.maxRange = d.b;
      this.minRange = d.b;
    },
    updatePoint(d){
      if(!this.chartSeries){
        return;
      }

      this.currentTime=d.t;
      // console.log(d,"===update==="+(this.openTime+this.timeRange-d.t)+"=="+this.timeRange)
      if(this.openTime+this.timeRange-d.t<1){
        this.addNewCandleTick(d);
        return;
      }
      this.maxRange = _.max([d.b,this.maxRange]);
      this.minRange = _.min([d.b,this.minRange]);
      let lastPoint = _.last(this.chartSeries.points);
      let newData = [d.t*1000,this.openPrice,this.maxRange,this.minRange,d.b];
      // console.log(d,"===updated====",newData);
      this.currentPrice = d.b;
      let yAxis = this.chart.yAxis[0];
      yAxis.options.plotLines[0].value = this.currentPrice;
      yAxis.options.plotLines[0].label.text = this.currentPrice;

      lastPoint.update(newData,true,false);
      yAxis.update(yAxis.options,true);
    },
    updateChartSeries(){
      this.chartSeries.setData(this.historyData);
      this.chart.rangeSelector.clickButton(this.rangeSelect);

      // 每次更新完数据重新计算极限值
      let extrem = this.chart.xAxis[0].getExtremes();
      this.newestRange = [extrem.min,extrem.max];

      this.chart.hideLoading();
    },
    initSocket(){
      // const socket = io("//dev.io.ubankfx.com");
      const socket = io("//10.0.1.18:8500",{
        transports:['websocket'],
        path:'/socket.io/'
      });
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

        if(this.isUpdating){
          this.updatePoint(d);
        }else{
          this.gotoNewestExtreme();
        }
      });
    },
    initChart(){
      let that = this;
      Highcharts.setOptions( {
        global: {
          useUTC: true,
        },
        lang: {
          noData: "No Data",
          shortMonths: ['01', '02', '03', '04', '05', '06',  '07', '08', '09', '10', '11', '12'],
        }
      } );
      // create the chart
      const options = {
        height:'100%',
        loading:{
          labelStyle:{
            fontSize:"20px",
            color:"#000",
          },
          style:{
            opacity:0.8,
          }
        },
        chart:{
          zoomType:null,
          events:{
            load: function(){
              // console.log("===load")
            },
            render:function(){
              // console.log("===render")
            }
          }
        },
        plotOptions:{
          //修改蜡烛颜色
          candlestick: {
            upLineColor:"#5ac71e",
            upColor:"#5ac71e",
            lineColor:"#f23244",
            color:"#f23244",
            yAxis:0,
            pointWidth:6, // 蜡烛宽度
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
          enabled: true,
          height:0,
          outlineWidth:0,
          handles:{
            enabled:false, // 选择器隐藏
          },
          xAxis:{
            visible:false,
          }
        },
        scrollbar:{
          enabled:false,
        },
        navigation:{
          enabled:false,
        },
        tooltip:{
          shared:true,
          split:false,
        },
        rangeSelector: {
          enabled: true,
          selected:0,
          inputEnabled:false,
          labelStyle:{
            display:"none",
          },
          buttonPosition:{
            x:400,
            y:0,
          },
          buttonTheme:{
            display:'none',
          },
          buttons:[
            {type:"hour",count:3,text:"3h"},
            {type:"hour",count:10,text:"10h"},
            {type:"day",count:1,text:"1d"},
            {type:"day",count:2,text:"2d"},
            {type:"week",count:1,text:"1w"},
            {type:"month",count:1,text:"1m"},
            {type:"month",count:5,text:"5m"},
            {type:"year",count:2,text:"2y"},
            {type:"year",count:8,text:"8y"},
          ]
        },
        xAxis: {
          events:{
            afterSetExtremes:function(e){
              const DEVIATION=60000; // 2分钟误差，毫秒单位
              let currMax = _.floor(e.max),currMin = _.floor(e.min),dataMax = e.dataMax,dataMin = e.dataMin;
              if(currMax==dataMax){
                that.newestRange = [currMin,currMax]; // 更新最新极限范围
                //启动更新
                that.isUpdating = true;
              }else if(currMin<=dataMin+DEVIATION){// 2分钟误差, 毫秒比对
                if(that.newestRange[0]&&that.newestRange[1]){
                  that.isUpdating = false;
                  console.log("====is need to ajax==");
                }
              }else{
                // 暂停更新
                that.isUpdating = false;
              }
            }
          },
          // endOnTick:true, // 这个会影响到拖动，会使endtime点不动进行扩大
          crosshair: {
            color:"#727A98",
            label: {
              formatter: function (e) {
                return Highcharts.dateFormat("%Y-%m-%d %H:%M:%S", e);
              },
              enabled: true,
              borderWidth: 1,
            },
            zIndex:10,
          },
          dateTimeLabelFormats:{
            minute: '%H:%M',
            hour: '%H:%M',
            day: '%b-%e',
            week: '%b-%e-%Y',
            month: '%Y-%b',
            year: '%Y-%b'
          },
        },
        yAxis: [ {
          height:"80%",
          showLastLabel:true,
          showFirstLabel:false,
          gridLineDashStyle:"longdash",
          gridLineWidth: 1,
          offset:55,
          labels:{
            step: 1,
            formatter: function(){
              return this.value;
            }
          },
          plotLines: [
            {
              value: this.currentPrice,
              color: 'gray',
              width: 1,
              label:{
                useHTML:true,
                align:"right",
                style:{
                  backgroundColor:"#000",
                  color:"#fff",
                  padding:"0 5px",
                  fontSize:"12px",
                },
                text:this.currentPrice,
                x:50,
                y:3,
              },
              zIndex:5,
            }
          ],

          crosshair: {
            color:"#727A98",
            label: {
              enabled: true,
              borderWidth: 1,
            }
          },
          showLastLabel: true, //是否显示最后一个轴标签
          resize: {
            enabled: true
          },
        },
        {
          top:"80%",
          height:"20%",
        }
        ],
        tooltip:{
          shared:true,
          split:false,
        },
        series: [ {
            type: 'candlestick',
            data: this.historyData,
            id:"aapl",
            dataGrouping:{
              enableds:true,
            },
            yAxis:0,
            tooltip:{
              shared:true,
              split:false,
              userHTML:true,
              headerFormat:'',
              pointFormat:'开盘：<p>{point.open}</p><br>最高：<p>{point.high}</p><br>最低：<p>{point.low}</p><br>收盘：<p>{point.close}</p><br>',
            },
          },
          {
            type:'sma',
            linkedTo:"aapl",
            name:"MA(5)",
            params:{
              period:5,
            }
          },
          {
            type:'sma',
            linkedTo:"aapl",
            name:"MA(10)",
            params:{
              period:10,
            }
          },
          {
            type:'sma',
            linkedTo:"aapl",
            name:"MA(20)",
            params:{
              period:20,
            }
          },
          {
            type:"bb",
            topLine:{
              styles:{
                lineColor:"pink",
              }
            },
            bottomLine: {  // 下轨线
                styles: {
                    lineColor: 'purple'
                }
            },
            color: '#006cee', //中轨颜色
            tooltip: {
                pointFormat: '<span style="color:{point.color}">\u25CF</span>' +
                '<b> {series.name}</b><br/>' +
                'UP: {point.top}<br/>' +
                'MB: {point.middle}<br/>' +
                'DN: {point.bottom}<br/>'
            },
            name: '布林（20,2）',
            linkedTo: 'aapl'
          },
          {
            yAxis:1,
            tooltip:{
              pointFormat:'<span style="color:{point.color}">\u25CF</span> <b> {series.name}</b><br/>' +
                'MACD 线：{point.MACD}<br/>' +
                '信号线：{point.signal}<br/>' +
                '振荡指标：{point.y}<br/>'
            },
            type:"macd",
            linkedTo:"aapl",
            params:{
              shortPeriod:12,
              longPeriod:26,
              signalPeriod:9,
              period:26,
            }
          }
        ]
      }
      this.chart = new Highcharts.stockChart( "chartId", options);
    },
    fetchChartHistoryData(){
      let st=this.currentTime-this.periodRange;
      let et = this.currentTime;
      this.chart&&this.chart.showLoading("加载中...");
      // m1为1小时数据
      let url = '//dev.io.ubankfx.com/chart?from='+st+'&to='+et+'&symbol='+this.productName+'&period='+this.period;
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
          this.updateChartSeries();
        }
      }).finally(()=>{
        this.chart.hideLoading();
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
