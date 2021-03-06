
// let Highcharts = require("highchart");
// import Highcharts from "highchart";
let originalDrawPoints = Highcharts.seriesTypes.column.prototype.drawPoints;
let originalDrawMACDPoints = Highcharts.seriesTypes.macd.prototype.drawPoints;
Highcharts.seriesTypes.macd.prototype.drawPoints = function(){
  let points = this.points,i=points.length;
  while(i--){
    var color = points[i].y>0 ? '#5ac71e' : '#f23244';
    points[i].color = color;
  }
  originalDrawMACDPoints.call(this);
}
Highcharts.seriesTypes.column.prototype.drawPoints = function(){
  let merge = Highcharts.merge,series=this,chart = this.chart,points=series.points,i=points.length,candleSeries=chart.get("aapl");
  while(i--){
    let candlePoint = candleSeries.points[i];
    var color = (candlePoint.open < candlePoint.close) ? '#5ac71e' : '#f23244';
    points[i].color = color;
    points[i].shapeArgs.width=candlePoint.shapeArgs.width;
  }
  originalDrawPoints.call(this);
}
function render(chart, point, text,ishigh) {
    let obj=null;
    if(ishigh){
      obj = chart.renderer.label("←"+text + ': ' + point.y,  point.plotX , point.plotY , 'callout', point.plotX + chart.plotLeft, point.plotY + chart.plotTop);
    }else{
      obj = chart.renderer.label("←"+text + ': ' + point.y,  point.plotX , point.plotY + chart.plotTop+20, 'callout', point.plotX + chart.plotLeft, point.plotY + chart.plotTop+point.shapeArgs.height);
    }

    obj.css({
    // color: '#FFFFFF',
    color:"#000",
    align: 'center'}).attr({
        // fill: 'rgba(0, 0, 0, 0.75)',
        padding: 8,
        r: 5,
        zIndex: 6
    }).add();

}
let VChart = {
  data(){
    return {
      recordCandlePoint:[],
      recordVolumnPoint:[],
      RANGE_LEVEL:4,
      candleSize:6,
      zoomButtons:[
        {type:"day",count:3,text:"3d"},
        {type:"week",count:1,text:"1w"},
        {type:"day",count:10,text:"10d"},
        {type:"week",count:2,text:"2w"},
        {type:"week",count:3,text:"3w"},
        // {type:"all"},
      ],
      zoomChart:1,
      MAX_POINT:500,
      isAutoToNews: true,
      isShowMALine:true,
      isShowBOLL:false,
      techType:0,
      page:1,
      volumnCount:0,
      isForceUpdateChart:false,
      socket:null,
      newestRange:[0,0],
      isUpdating:true, // 图表更新开关
      inProgress:false,
      maset:[5,10,20],
      productName:"EURUSD",
      // productName:"USDJPY",
      // productName:"XAUUSD",
      currentTime:0,
      timeRange:60*60,
      currentPrice:0,
      maxRange:0,
      minRange:0,
      openPrice:"",
      openTime:0,
      chart:null,
      historyData:[],
      volumnData:[], // 交易量数据
      period:"H1",
      periods:['M1','M5','M15','M30','H1','H4','D1','W1','MN'],
    }
  },
  template:`
    <div class="chart">
      <h3>{{moment.unix(currentTime).utc().format('YYYY-MM-DD HH:mm:ss')}}</h3>
      <strong class='title'>{{this.productName}}</strong>
      <ul class="btns_history">
        <li class="item" :class="{'active':(p==period)}" v-for="p in periods" @click.stop="changeLineCycle(p,false)">{{p}}</li>
      </ul>
      <ul class="btns_history">
        <li class="item" :class="{'active':isShowMALine}" @click.stop="showMALine">MA</li>
        <li class="item" :class="{'active':isShowBOLL}" @click.stop="showBOLL">BOLL</li>
      </ul>
      <ul class="btns_history">
        <li class="item" :class="{'active':techType==0}" @click.stop="showMACD">MACD</li>
        <li class="item" :class="{'active':techType==1}" @click.stop="showRSI">RSI</li>
        <li class="item" :class="{'active':techType==2}" @click.stop="showVolumn">VOL</li>
      </ul>
      <ul class="btns_history">
        <li class="item" :class="{'active':isAutoToNews}" @click.stop="clickAutoToNews">AN</li>
        <li class="item" @click.stop="clickZoom(1)">+</li>
        <li class="item" @click.stop="clickZoom(0)">-</li>
      </ul>
      <div id="chartId"></div>
    </div>
  `,
  created() {
    this.initSocket();
  },
  computed:{
    chartSeries(){
      return this.chart&&this.chart.get("aapl");
    },
    chartMA5Series(){
      return this.chart&&this.chart.get('ma5');
    },
    chartMA10Series(){
      return this.chart&&this.chart.get('ma10');
    },
    chartMA20Series(){
      return this.chart&&this.chart.get('ma20');
    },
    chartSeriesBOOL(){
      return this.chart&&this.chart.get("bb");
    },
    chartSeriesMACD(){
      return this.chart&&this.chart.get("macd");
    },
    chartSeriesRSI6(){
      return this.chart&&this.chart.get("rsi6");
    },
    chartSeriesRSI12(){
      return this.chart&&this.chart.get("rsi12");
    },
    chartSeriesRSI24(){
      return this.chart&&this.chart.get("rsi24");
    },
    chartSeriesVolumn(){
      return this.chart&&this.chart.get("volumn");
    },
    points(){
      return this.chartSeries.points;
    }
  },
  methods:{
    clickZoom(type){
      if(type==0){
        this.zoomChart++;
        if(this.zoomChart>this.RANGE_LEVEL){
          this.zoomChart=this.RANGE_LEVEL;
          return;
        }
        if(this.zoomChart==1){
          this.candleSize-=this.RANGE_LEVEL+2+this.zoomChart;
        }else{
          this.candleSize-=(this.RANGE_LEVEL+1-this.zoomChart);
        }
      }else{
        this.zoomChart--;
        if(this.zoomChart<0){
          this.zoomChart=0;
          return;
        }
        if(this.zoomChart==0){
          this.candleSize+=this.RANGE_LEVEL+3-this.zoomChart;
        }else{
          this.candleSize+=this.RANGE_LEVEL-this.zoomChart;
        }
      }
      this.chart.rangeSelector.clickButton(this.zoomChart);
      this.chartSeries.update({"pointWidth":this.candleSize});
    },
    changeLineCycle(p){
      if(p==this.period){
        return;
      }
      this.zoomChart = 1; // 重置缩放比例
      this.candleSize=6;// 重置蜡烛大小
      switch(p){
        case "M1":{
          this.timeRange=60;
          // M1
          this.zoomButtons = [
            {type:"minute",count:30,text:"30m"},
            {type:"hour",count:2,text:"2h"},
            {type:"hour",count:3,text:"3h"},
            {type:"hour",count:4,text:"4h"},
            {type:"hour",count:6,text:"6h"},
            // {type:"all"},
          ];
        }break;
        case "M5":{
          this.timeRange=5*60;
          this.zoomButtons=[
            {type:"hour",count:5,text:"5h"},
            {type:"hour",count:10,text:"10h"},
            {type:"hour",count:15,text:"15h"},
            {type:"hour",count:20,text:"20h"},
            {type:"day",count:1,text:"1d"},
            // {type:"all"},
          ]
        }break;
        case "M15":{
          this.timeRange=15*60;
          this.zoomButtons=[
            {type:"day",count:2,text:"2d"},
            {type:"day",count:4,text:"4d"},
            {type:"day",count:5,text:"5d"},
            {type:"day",count:7,text:"7d"},
            {type:"day",count:9,text:"9d"},
            // {type:"all"},
          ]
        }break;
        case "M30":{
          this.timeRange=30*60;
          this.zoomButtons=[
            {type:"day",count:4,text:"4d"},
            {type:"day",count:6,text:"6d"},
            {type:"day",count:8,text:"8d"},
            {type:"day",count:10,text:"10d"},
            {type:"day",count:11,text:"11d"},
            // {type:"all"},
          ]
        }break;
        case "H1":{
          this.timeRange=60*60;
          this.zoomButtons=[
            {type:"day",count:3,text:"3d"},
            {type:"week",count:1,text:"1w"},
            {type:"day",count:10,text:"10d"},
            {type:"week",count:2,text:"2w"},
            {type:"week",count:3,text:"3w"},
            // {type:"all"},
          ]
        }break;
        case "H4":{
          this.timeRange=4*60*60;
          this.zoomButtons=[
            {type:"week",count:2,text:"2w"},
            {type:"month",count:1,text:"1m"},
            {type:"week",count:6,text:"6w"},
            {type:"month",count:2,text:"2m"},
            {type:"month",count:3,text:"3m"},
            // {type:"all"},
          ]
        }break;
        case "D1":{
          this.timeRange=24*60*60;
          this.zoomButtons=[
            {type:"month",count:2,text:"2m"},
            {type:"month",count:4,text:"4m"},
            {type:"month",count:7,text:"7m"},
            {type:"month",count:10,text:"10m"},
            {type:"month",count:14,text:"14m"},
            // {type:"all"},
          ]
        }break;
        case "W1":{
          this.timeRange=7*24*60*60;
          this.zoomButtons=[
            {type:"year",count:1,text:"1y"},
            {type:"year",count:2,text:"2y"},
            {type:"year",count:3,text:"3y"},
            {type:"year",count:5,text:"5y"},
            {type:"year",count:7,text:"7y"},
            // {type:"all"},
          ]
        }break;
        case "MN":{
          this.timeRange=30*24*60*60;
          this.zoomButtons=[
            {type:"year",count:5,text:"5y"},
            {type:"year",count:9,text:"12y"},
            {type:"year",count:14,text:"14y"},
            {type:"year",count:16,text:"16y"},
            {type:"year",count:18,text:"18y"},
            // {type:"all"},
          ]
        }break;
      }
      this.fetchChartHistory(p,true);
    },
    clickAutoToNews(){
      this.isAutoToNews = !this.isAutoToNews;
    },
    prevPage(){
    },
    gotoNewestExtreme(){
      let xAxis = this.chart.xAxis[0];
      let extremes = xAxis.getExtremes();
      if(extremes.userMax==this.newestRange[1]&&extremes.userMin==this.newestRange[0]){return;}
      xAxis.setExtremes(this.newestRange[0],this.newestRange[1],true,false); // 有socket更新就设置到最新极限区间
    },
    displayProduct(k){
      return k&&this.i18n('trade.'+k.replace(/\.pro$/,''))||"";
    },
    showLoginDialog(){
      this.$emit("showLoginDialog");
    },
    updateChartSeries(){
      this.chartSeries.setData(this.historyData);

      // 每次更新完数据重新计算极限值(min和max是相对的，只有在最新区域内时才正确)
      let extrem = this.chart.xAxis[0].getExtremes();
      if(extrem.max<this.newestRange[1]){
        // 不在最新区间下的区间更新公式如下
        // 新点区间范围 = 标记点数*时间间隔
        let _times = this.recordCandlePoint.length*this.timeRange*1000;
        console.log(this.newestRange,"=t==="+_times)
        this.newestRange[0] += _times;
        this.newestRange[1] += _times;
      }else{
        this.newestRange = [extrem.min,extrem.max];
      }

      if(this.isShowMALine){
        this.chartMA5Series.update({linkedTo:"aapl"});
        this.chartMA10Series.update({linkedTo:"aapl"});
        this.chartMA20Series.update({linkedTo:"aapl"});
      }else if(this.isShowBOLL){
        this.chartSeriesBOOL.update({linkedTo:"aapl"});
      }
      // 默认显示macd
      if(this.techType==0){
        this.chartSeriesMACD.update({linkedTo:"aapl"});
      }else if(this.techType==1){
        this.chartSeriesRSI6.update({linkedTo:"aapl"});
        this.chartSeriesRSI12.update({linkedTo:"aapl"});
        this.chartSeriesRSI24.update({linkedTo:"aapl"});
      }else if(this.techType==2){
        this.chartSeriesVolumn.setData(this.volumnData);
      }
    },
    showMALine(){
      this.isShowMALine = !this.isShowMALine;
      if(this.isShowMALine){
        this.chartMA5Series.show();
        this.chartMA10Series.show();
        this.chartMA20Series.show();
        this.isShowBOLL = true;
        this.showBOLL();
      }else{
        this.chartMA5Series.hide();
        this.chartMA10Series.hide();
        this.chartMA20Series.hide();
      }
    },
    showBOLL(){
      this.isShowBOLL = !this.isShowBOLL;
      if(this.isShowBOLL){
        this.chartSeriesBOOL.show();
        this.isShowMALine = true;
        this.showMALine();
      }else{
        this.chartSeriesBOOL.hide();
      }
    },
    showMACD(){
      this.techType = 0;
      this.chartSeriesRSI6.hide();
      this.chartSeriesRSI12.hide();
      this.chartSeriesRSI24.hide();
      this.chartSeriesVolumn.hide();

      this.chartSeriesMACD.update({type:"macd"})
      this.chartSeriesMACD.show();
    },
    showRSI(){
      this.techType = 1;
      this.chartSeriesVolumn.hide();
      this.chartSeriesMACD.hide();

      this.chartSeriesRSI6.show();
      this.chartSeriesRSI12.show();
      this.chartSeriesRSI24.show();
    },
    showVolumn(){
      this.techType = 2;
      this.chartSeriesRSI6.hide();
      this.chartSeriesRSI12.hide();
      this.chartSeriesRSI24.hide();
      this.chartSeriesMACD.hide();

      this.chartSeriesVolumn.show();
    },
    fetchChartHistory(period,isfocueupdate){
      if(isfocueupdate){
        this.isForceUpdateChart = true;
      }else if(this.period===period){
        this.isForceUpdateChart = true;
      }
      this.period = period;
      this.fetchChartHistoryData();
    },
    fetchChartHistoryData(){
      let et = this.currentTime;
      this.chart&&this.chart.showLoading("加载中...");
      // m1为1小时数据
      let url = '//io.ubankfx.com/chart?to='+et+'&symbol='+this.productName+'&period='+this.period+"&num="+this.MAX_POINT;
      this.inProgress = true;
      this.$http.get(url).then((resp)=>{
        let _data = resp.body.data&&_.sortBy(resp.body.data,['ot']);
        this.historyData=[]; // 历史数据数据重置
        this.volumnData = [];// 交易量数据重置
        this.historyData = _.map(_data,(v,k)=>{
          this.volumnData.push([v.ot*1000,v.vl]); // 成交量
          // time, open, high, low, close
          return [v.ot*1000,v.op,v.hp,v.lp,v.cp];
        });
        // 如果有chart对象就update否则就初始化chart表
	      let _lastData = _.last(this.historyData);
        if(!_lastData){
          return;
        }
        this.openTime = _.floor(_lastData[0]/1000);// 当前开盘时间
        this.openPrice = _lastData[1];//初始化最近一次的卖出价为新点的开盘价
        this.maxRange = _lastData[2];
        this.minRange = _lastData[3];
        this.volumnCount = _.last(this.volumnData)[1]; // 最新点的交易量初始化

        if(this.isForceUpdateChart){ // 以下会触发这里：重复点击m1,切换产品,historyData超载
          this.initChart();
          this.showMACD(); // 默認显示macd
        }else{
          // 如果有chart对象就update否则就初始化chart表
          if(!this.chart){
            this.currentPrice = this.openPrice;
            this.currentTime = this.openTime;
            this.initChart();
          }else{
            // 更新图表
            this.updateChartSeries();
          }
        }
      }).finally(()=>{
        // range selector 触发按钮
        this.chart&&this.chart.hideLoading();
        this.isForceUpdateChart = false;
        this.inProgress=false;
      });
    },
    resetHistroyData(){
      console.log(this.remarkVolumnPoint,"==resetHistroyData==",this.remarkCandlePoint);
    },
    addNewCandleTick(d){
      // console.log(d,"===add point=="+this.openTime+"==="+(this.openTime-d.t))

      this.openTime+=this.timeRange;

      let newData = [this.openTime*1000,d.a,this.maxRange,this.minRange,d.b];// 只关注最后一次的收盘价
      let volumnData = [this.openTime*1000,this.volumnCount];

      // console.log(this.historyData.length+"==add news=",newData);
      if(this.historyData.length>=1000){
        this.fetchChartHistory(this.period,true);//重新更新数据
      }else{
        this.historyData.push(newData);
        this.volumnData.push(volumnData);
        this.updateChartSeries();
        this.volumnCount = 0; // 交易量重置
      }

      this.openPrice = d.b;
      this.maxRange = d.b;
      this.minRange = d.b;
    },
    updatePoint(d){
      if(!this.chartSeries){
        return;
      }
      this.volumnCount++; //每一次报价，交易量+1统计

      this.currentTime=d.t;

      if(this.openTime+this.timeRange-d.t<1){
        this.addNewCandleTick(d);
        return;
      }
      this.maxRange = _.max([d.b,this.maxRange]);
      this.minRange = _.min([d.b,this.minRange]);
      let lastPoint = _.last(this.chartSeries.points);
      let newData = [lastPoint.x,this.openPrice,this.maxRange,this.minRange,d.b];
      // console.log(d,"===updated====",newData);
      this.currentPrice = d.b;
      let yAxis = this.chart.yAxis[0];
      yAxis.options.plotLines[0].value = this.currentPrice;
      yAxis.options.plotLines[0].label.text = this.currentPrice;
      yAxis.update();
      lastPoint.update(newData,true,false);
      if(this.techType==2){
        let lastVolPoint = _.last(this.chartSeriesVolumn.points);
        lastVolPoint.update([lastVolPoint.x,this.volumnCount]);
      }
    },
    recordUpdatePoint(d){
      if(!this.chartSeries){
        return;
      }
      this.volumnCount++; //每一次报价，交易量+1统计

      this.currentTime=d.t;
      // console.log("=re==update==="+(this.openTime+this.timeRange-d.t));
      if(this.openTime+this.timeRange-d.t<1){
        this.openTime+=this.timeRange;
        let newData = [this.openTime*1000,this.openPrice,this.maxRange,this.minRange,d.b];// 只关注最后一次的收盘价
        let volumnData = [this.openTime*1000,this.volumnCount];
        this.recordCandlePoint.push(newData);
        this.recordVolumnPoint.push(volumnData);

        console.log(this.recordCandlePoint,"=record==",this.recordVolumnPoint)

        this.openPrice = d.b;
        this.maxRange = d.b;
        this.minRange = d.b;
        this.volumnCount = 0; // 交易量重置
        return;
      }
      this.maxRange = _.max([d.b,this.maxRange]);
      this.minRange = _.min([d.b,this.minRange]);
      this.currentPrice = d.b;
    },
    restoreUpdatePoint(){
      if(_.isEmpty(this.recordCandlePoint)||_.isEmpty(this.recordVolumnPoint)){
        return;
      }
      // console.log(this.recordCandlePoint.length,"==restore up 11=",this.historyData.length)
      // 历史数据加入新点
      this.historyData = _.concat(this.historyData,this.recordCandlePoint);
      this.volumnData = _.concat(this.volumnData,this.recordVolumnPoint);
      // console.log(this.recordCandlePoint.length,"==restore up 22=",this.historyData.length)
      // 更新图表数据
      this.updateChartSeries();

      this.recordCandlePoint = []; // 记录点重置
      this.recordVolumnPoint = [];
    },
    initSocket(){
      this.socket = io("//io.ubankfx.com",{
        transports:['websocket'],
        path:'/socket.io/'
      });
      this.socket.on("connect",()=>{
        this.socket.emit("quotes:subscribe","quotes");
      });
      this.socket.on("quotes:init",(data)=>{
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
        this.fetchChartHistory(this.period,true);
      })
      this.socket.on("quotes:update",(data)=>{
        // console.log("==update:"+data);
        let d = JSON.parse(data);
        if(d.s!=this.productName)return;

        // 在最新位置，无论是否自动最新都更新图表
        if(this.isUpdating){
          this.updatePoint(d);
        }else{
          // 如果不是在最新位置，则需要判断是否设置了
          // 自动最新来判断是否跳转到最新点的更新
          if(this.isAutoToNews){
            // 更新之前需要判断是否有记录点
            // 如果有则更新historyData把点加进来
            this.restoreUpdatePoint();
            this.gotoNewestExtreme();
          }else{
            // 如果不是在最新，也不需要跳转到最新则用户可以自由滑动查看历史
            // 但是此时需要记录是否有新点加入
            this.recordUpdatePoint(d);
          }
        }
      });
    },
    initChart(){
      let that = this;
      let count=0;
      let openText="开盘",
      closeText = "收盘",
      highText = "最高",
      lowText ="最低",
      bollTitle = "布林(20,2)",
      macdText = "MACD线",
      signalText = "信号线",
      oscText = "震蕩指標",
      volumnTitle = "交易量";
      Highcharts.setOptions( {
        global: {
          useUTC: true,
        },
        lang: {
          rangeSelectorZoom:"",
          noData: "No Data",
          shortMonths: ['01', '02', '03', '04', '05', '06',  '07', '08', '09', '10', '11', '12'],
        }
      } );
      // create the chart
      const options = {
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
          backgroundcolor:"gray",
          zoomType:"xy",
          spacingBottom:5,
          zoomType:null,
          events:{
            load: function(){
              // console.log("===load"+that.zoomChart)
              this.rangeSelector.clickButton(that.zoomChart);

              // var min = 1000,
              //     max = 0,
              //     pointsToShow = [0, 0],
              //     points = this.series[0].points;
              // _.forEach(points, function(p,idx) {
              //     //console.log(p);
              //     if(p.y>max) {
              //         pointsToShow[0] = idx;
              //         max = p.y;
              //     }
              //     if(p.y<min) {
              //         pointsToShow[1] = idx;
              //         min = p.y;
              //     }
              // });
              // render(this, points[pointsToShow[0]], 'Max',true);
              // render(this, points[pointsToShow[1]], 'Min',false);
            },
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
            pointWidth:this.candleSize, // 蜡烛宽度
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
            pointPadding:0,
            groupPadding:0,
            marker:{enabled:false},
            dataGrouping: {
              enabled:false,
            },
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
          margin:0,
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
          selected:this.zoomChart,
          inputEnabled:false,
          labelStyle:{
            display:"none",
          },
          buttonPosition:{
            x:200,
            y:0,
          },
          buttonTheme:{
            display:'none',
          },
          buttons:this.zoomButtons,
        },
        xAxis: [
          {
            type:"datetime",
            events:{
              afterSetExtremes:function(e){
                const DEVIATION=60000; // 2分钟误差，毫秒单位
                let currMax = _.floor(e.max),currMin = _.floor(e.min),dataMax = e.dataMax,dataMin = e.dataMin;
                // console.log(currMax+"=afse==="+dataMax)
                if(currMax==dataMax){
                  that.newestRange = [currMin,currMax]; // 更新最新极限范围
                  //启动更新
                  that.isUpdating = true;
                }else if(currMin<=dataMin+DEVIATION){// 2分钟误差, 毫秒比对
                  if(that.newestRange[0]&&that.newestRange[1]){
                    that.isUpdating = false;
                    // that.page++;
                    console.log("====is need to ajax==");
                    // that.prevPage();
                  }
                }else{
                  // 暂停更新
                  that.isUpdating = false;
                }
              }
            },
            dateTimeLabelFormats:{
              minute: '%H:%M',
              hour: '%H:%M',
              day: '%b-%e',
              week: '%e-%Y',
              month: '%Y-%b',
              year: '%Y-%b'
            },
            minPadding: 0,
            maxPadding:0,
            endOnTick:false,
            crosshair:{
              color:"#727A98",
              label: {
                formatter: function (e) {
                  return Highcharts.dateFormat("%Y-%m-%d %H:%M", e);
                },
                enabled: true,
                borderWidth: 1,
              },
              zIndex:10,
            },
            // labels:{
            //   formatter:function(){
            //     console.log("===",this.value)
            //     reutrn this.value;
            //   }
            // }
          }
        ],
        yAxis: [{
          height:'80%',
          showLastLabel: true, //是否显示最后一个轴标签
          showFirstLabel:false,
          gridLineDashStyle:"longdash",
          gridLineWidth: 1,
          offset:55,
          labels:{
            step: 1,
            formatter: function(){
              return this.value.toFixed(6);
            }
          },
          plotLines: [
            {
              value: this.currentPrice.toFixed(6),
              color: 'gray',
              width: 1,
              id:"price",
              label:{
                useHTML:true,
                align:"right",
                style:{
                  backgroundColor:"#000",
                  color:"#fff",
                  padding:"0 5px",
                  fontSize:"12px",
                },
                text:this.currentPrice.toFixed(6),
                x:55,
                y:3,
              },
              zIndex:5,
            }
          ],

          resize: {
            enabled: true
          },
          minPadding: 0,
          maxPadding:0,
          endOnTick:false,
          crosshair:{
            snap:false,
            color:"#727A98",
            label: {
              enabled: true,
              borderWidth: 1,
              formatter:function(v){
                return v.toFixed(6);
              }
            }
          }
        },
        {
          top:"80%",
          height:"20%",
          minPadding: 0,
          maxPadding:0,
          endOnTick:false,
        }],
        series: [ {
            type: 'candlestick',
            id:"aapl",
            data: this.historyData,
            dataGrouping:{
              enabled:false,
            },
            tooltip:{
              // headerFormat:'',
              pointFormat:openText+'：<p>{point.open}</p><br>'+highText+'：<p>{point.high}</p><br>'+lowText+'：<p>{point.low}</p><br>'+closeText+'：<p>{point.close}</p><br>',
            },
            // dataLabels:{
            //   enabled: true,
            //   shadow:true,
            //   style:{
            //     fontWeight: 'bold'
            //   },
            //   useHTML: true,
            //   inside:true,
            //   zIndex:5,
            //   align:"right",
            //   formatter:function(){
            //     if(this.point.high===this.point.series.dataMax){
            //       let t = -this.point.shapeArgs.height+10;
            //       return '<span class="mark high" style="top:'+t+'px;">High:' + this.point.high + '</span>';
            //     }else if(this.point.low===this.point.series.dataMin) {
            //       let t = this.point.shapeArgs.height+10;
            //       return '<span  class="mark low" style="top:'+t/2+'px;">Low:' + this.point.low + '</span>';
            //     }
            //   }
            // },
          },
          {
            type: 'sma',
            name: 'MA5',
            id:"ma5",
            linkedTo:"aapl",
            color:'#58C6FF',
            lineWidth:1,
            dataGrouping: {
          	  enabled: false
            },
            params:{
              period:5,
            },
            tooltip:{
              pointFormat:'<span style="color:{point.color}">\u25CF</span><b> {series.name}</b>:{point.y}<br>',
            }
          },
          {
            type: 'sma',
            name: 'MA10',
            id:"ma10",
            linkedTo:"aapl",
            color:'#ED58FF',
            lineWidth:1,
            dataGrouping: {
          	  enabled: false
            },
            params:{
              period:10,
            },
            tooltip:{
              headerFormat:'',
              pointFormat:'<span style="color:{point.color}">\u25CF</span><b> {series.name}</b>:{point.y}<br>',
            }
          },
          {
            type: 'sma',
            name: 'MA20',
            id:"ma20",
            linkedTo:"aapl",
            color:'#FFAE58',
            lineWidth:1,
            dataGrouping: {
          	  enabled: false
            },
            params:{
              period:20,
            },
            tooltip:{
              headerFormat:'',
              pointFormat:'<span style="color:{point.color}">\u25CF</span><b> {series.name}</b>:{point.y}<br>',
            }
          },
          {
            type:"bb",
            id:"bb",
            visible:false,
            lineWidth:1,
            topLine:{
              styles:{
                lineColor:"#ED58FF",
              }
            },
            bottomLine: {  // 下轨线
              styles: {
                lineColor: '#58C6FF'
              }
            },
            color: '#FFAE58', //中轨颜色
            tooltip: {
              headerFormat:'',
              pointFormat: '<span style="color:{point.color}">\u25CF</span>' +
                '<b> {series.name}</b><br/>' +
                'UP: {point.top}<br/>' +
                'MB: {point.middle}<br/>' +
                'DN: {point.bottom}<br/>'
            },
            name: bollTitle,
            linkedTo: 'aapl'
          },
          {
            yAxis:1,
            id:"macd",
            // type:"macd",// 先注销，否则没数据会报错，showMACD时配上type
            color:"#7CB5EC",
            linkedTo:"aapl",
            // color: '#5ac71e',
            // negativeColor: '#f23244',
            pointWidth:2,
            signalLine:{
              styles:{
                lineColor:"#58c6ff",
              }
            },
            macdLine:{
              styles:{
                lineColor:"#ffae58"
              }
            },
            params:{
              shortPeriod:12,
              longPeriod:26,
              signalPeriod:9,
              period:26,
            },
            tooltip:{
              headerFormat:'',
              pointFormat:'<span style="color:{point.color}">\u25CF</span> <b> {series.name}</b><br/>' +
                macdText+'：{point.MACD}<br/>' +
                signalText+'：{point.signal}<br/>' +
                oscText+'：{point.y}<br/>'
            },
          },
	        {
            type: 'rsi',
            name:"RSI(6)",
            id:"rsi6",
            linkedTo: 'aapl',
            params:{
              period:6,
              decimals:6,
            },
            yAxis:1,
            visible:false,
          },
          {
            type: 'rsi',
            name:"RSI(12)",
            id:"rsi12",
            linkedTo: 'aapl',
            params:{
              period:12,
              decimals:6,
            },
            yAxis:1,
            visible:false,
          },
          {
            type: 'rsi',
            name:"RSI(24)",
            id:"rsi24",
            linkedTo: 'aapl',
            params:{
              period:24,
              decimals:6,
            },
            yAxis:1,
            visible:false,
          },
          {
            type: 'column',
            id:"volumn",
            pointWidth:6,
            name:volumnTitle,
            groupPadding:0,
            pointPadding:0,
            data:this.volumnData,
            yAxis:1,
            color:"#7CB5EC",
            tooltip:{
              headerFormat:'',
              // pointFormat:'<span style="color:{point.color}">\u25CF</span><b> {series.name}</b>:{point.y}<br>',
              pointFormat:"",
            },
            dataGrouping:{
              enabled:false,
            },
          }
        ]
      }
      this.chart = new Highcharts.stockChart( "chartId", options);
    },

  }
}

let app = new Vue({
  components:{
    vchart:VChart
  }
})
app.$mount("#root");
