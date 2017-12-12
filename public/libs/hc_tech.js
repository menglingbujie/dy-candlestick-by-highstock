(function(k){"object"===typeof module&&module.exports?module.exports=k:k(Highcharts)})(function(k){(function(b){var k=b.each,p=b.error,m=b.Series,g=b.isArray,l=b.addEvent;b=b.seriesType;b("sma","line",{name:"SMA (14)",tooltip:{valueDecimals:4},linkedTo:void 0,params:{index:0,period:14}},{bindTo:{series:!0,eventName:"updatedData"},calculateOn:"init",init:function(e,a){function d(){var a=c.getValues(c.linkedParent,c.options.params)||{values:[],xData:[],yData:[]};c.xData=a.xData;c.yData=a.yData;c.options.data=
a.values;!1===c.bindTo.series&&(delete c.processedXData,c.isDirty=!0,c.redraw());c.isDirtyData=!1}var c=this;m.prototype.init.call(c,e,a);e.linkSeries();c.dataEventsToUnbind=[];if(!c.linkedParent)return p("Series "+c.options.linkedTo+" not found! Check `linkedTo`.");c.dataEventsToUnbind.push(l(c.bindTo.series?c.linkedParent:c.linkedParent.xAxis,c.bindTo.eventName,d));if("init"===c.calculateOn)d();else var g=l(c.chart,c.calculateOn,function(){d();g()});return c},getValues:function(e,a){var d=a.period,
c=e.xData;e=e.yData;var l=e.length,q=0,f=0,h=[],n=[],b=[],p=-1,m;if(c.length<d)return!1;for(g(e[0])&&(p=a.index?a.index:0);q<d-1;)f+=0>p?e[q]:e[q][p],q++;for(a=q;a<l;a++)f+=0>p?e[a]:e[a][p],m=[c[a],f/d],h.push(m),n.push(m[0]),b.push(m[1]),f-=0>p?e[a-q]:e[a-q][p];return{values:h,xData:n,yData:b}},destroy:function(){k(this.dataEventsToUnbind,function(l){l()});m.prototype.destroy.call(this)}})})(k)});
(function(k){"object"===typeof module&&module.exports?module.exports=k:k(Highcharts)})(function(k){(function(b){var k=b.isArray;b=b.seriesType;b("ema","sma",{name:"EMA (14)",params:{index:0,period:14}},{getValues:function(b,m){var g=m.period,l=b.xData,e=b.yData,a=e?e.length:0;b=2/(g+1);var d=0,c=0,p=0,q=[],f=[],h=[],n=-1,r=[];if(l.length<g)return!1;for(k(e[0])&&(n=m.index?m.index:0);c<g;)r.push([l[c],0>n?e[c]:e[c][n]]),p+=0>n?e[c]:e[c][n],c++;m=p/g;for(g=c;g<a;g++)c=0>n?e[g-1]:e[g-1][n],d=[l[g-1],
0===d?m:c*b+d*(1-b)],q.push(d),f.push(d[0]),h.push(d[1]),d=d[1],r.push([l[g],0>n?e[g]:e[g][n]]);e=0>n?e[g-1]:e[g-1][n];d=[l[g-1],0===d?void 0:e*b+d*(1-b)];q.push(d);f.push(d[0]);h.push(d[1]);return{values:q,xData:f,yData:h}}})})(k);(function(b){var k=b.seriesType,p=b.each,m=b.merge,g=b.defined,l=b.seriesTypes.sma,e=b.seriesTypes.ema;k("macd","sma",{name:"MACD (26, 12, 9)",params:{shortPeriod:12,longPeriod:26,signalPeriod:9,period:26},signalLine:{styles:{lineWidth:1,lineColor:void 0}},macdLine:{styles:{lineWidth:1,
lineColor:void 0}},threshold:0,groupPadding:.1,pointPadding:.1,states:{hover:{halo:{size:0}}},tooltip:{pointFormat:'<span style="color:{point.color}">\u25cf</span> <b> {series.name}</b><br/>Value: {point.MACD}<br/>Signal: {point.signal}<br/>Histogram: {point.y}<br/>'},dataGrouping:"averages",minPointLength:0},{pointArrayMap:["y","signal","MACD"],parallelArrays:["x","y","signal","MACD"],pointValKey:"y",markerAttribs:b.noop,getColumnMetrics:b.seriesTypes.column.prototype.getColumnMetrics,crispCol:b.seriesTypes.column.prototype.crispCol,
init:function(){l.prototype.init.apply(this,arguments);this.options=m({signalLine:{styles:{lineColor:this.color}},macdLine:{styles:{color:this.color}}},this.options)},toYData:function(a){return[a.y,a.signal,a.MACD]},translate:function(){var a=this,d=["plotSignal","plotMACD"];b.seriesTypes.column.prototype.translate.apply(a);p(a.points,function(c){p([c.signal,c.MACD],function(l,e){null!==l&&(c[d[e]]=a.yAxis.toPixels(l,!0))})})},destroy:function(){this.graph=null;this.graphmacd=this.graphmacd.destroy();
this.graphsignal=this.graphsignal.destroy();l.prototype.destroy.apply(this,arguments)},drawPoints:b.seriesTypes.column.prototype.drawPoints,drawGraph:function(){for(var a=this,d=a.points,c=d.length,e=a.options,b={options:{gapSize:e.gapSize}},f=[[],[]],h;c--;)h=d[c],g(h.plotMACD)&&f[0].push({plotX:h.plotX,plotY:h.plotMACD,isNull:!g(h.plotMACD)}),g(h.plotSignal)&&f[1].push({plotX:h.plotX,plotY:h.plotSignal,isNull:!g(h.plotMACD)});p(["macd","signal"],function(c,d){a.points=f[d];a.options=m(e[c+"Line"].styles,
b);a.graph=a["graph"+c];l.prototype.drawGraph.call(a);a["graph"+c]=a.graph});a.points=d;a.options=e},getValues:function(a,d){var c=0,l,b,f=[],h=[],g=[];l=e.prototype.getValues(a,{period:d.shortPeriod});b=e.prototype.getValues(a,{period:d.longPeriod});l=l.values;b=b.values;for(a=1;a<=l.length;a++)b[a-1]&&b[a-1][1]&&f.push([l[a+d.shortPeriod+1][0],0,null,l[a+d.shortPeriod+1][1]-b[a-1][1]]);for(a=0;a<f.length;a++)h.push(f[a][0]),g.push([0,null,f[a][3]]);d=e.prototype.getValues({xData:h,yData:g},{period:d.signalPeriod,
index:2});d=d.values;for(a=0;a<f.length;a++)f[a][0]>=d[0][0]&&(f[a][2]=d[c][1],g[a]=[0,d[c][1],f[a][3]],null===f[a][3]?(f[a][1]=0,g[a][0]=0):(f[a][1]=f[a][3]-d[c][1],g[a][0]=f[a][3]-d[c][1]),c++);return{values:f,xData:h,yData:g}}})})(k)});
(function(k){"object"===typeof module&&module.exports?module.exports=k:k(Highcharts)})(function(k){(function(b){var k=b.isArray;b.seriesType("rsi","sma",{name:"RSI (14)",params:{period:14,decimals:4}},{getValues:function(b,m){var g=m.period,l=b.xData,e=(b=b.yData)?b.length:0;m=m.decimals;var a=1,d=[],c=[],p=[],q=0,f=0,h,n,r;if(l.length<g||!k(b[0])||4!==b[0].length)return!1;for(;a<g;)h=parseFloat((b[a][3]-b[a-1][3]).toFixed(m)),0<h?q+=h:f+=Math.abs(h),a++;n=parseFloat((q/(g-1)).toFixed(m));for(r=parseFloat((f/
(g-1)).toFixed(m));a<e;a++)h=parseFloat((b[a][3]-b[a-1][3]).toFixed(m)),0<h?(q=h,f=0):(q=0,f=Math.abs(h)),n=parseFloat(((n*(g-1)+q)/g).toFixed(m)),r=parseFloat(((r*(g-1)+f)/g).toFixed(m)),q=0===r?100:0===n?0:parseFloat((100-100/(1+n/r)).toFixed(m)),d.push([l[a],q]),c.push(l[a]),p.push(q);return{values:d,xData:c,yData:p}}})})(k)});
(function(k){"object"===typeof module&&module.exports?module.exports=k:k(Highcharts)})(function(k){(function(b){var k=b.each,p=b.merge,m=b.isArray,g=b.seriesTypes.sma;b.seriesType("bb","sma",{name:"BB (20, 2)",params:{period:20,standardDeviation:2,index:3},bottomLine:{styles:{lineWidth:1,lineColor:void 0}},topLine:{styles:{lineWidth:1,lineColor:void 0}},tooltip:{pointFormat:'<span style="color:{point.color}">\u25cf</span><b> {series.name}</b><br/>Top: {point.top}<br/>Middle: {point.middle}<br/>Bottom: {point.bottom}<br/>'},
marker:{enabled:!1},dataGrouping:{approximation:"averages"}},{pointArrayMap:["top","middle","bottom"],pointValKey:"middle",init:function(){g.prototype.init.apply(this,arguments);this.options=p({topLine:{styles:{lineColor:this.color}},bottomLine:{styles:{lineColor:this.color}}},this.options)},toYData:function(b){return[b.top,b.middle,b.bottom]},translate:function(){var b=this,e=["plotTop","plotMiddle","plotBottom"];g.prototype.translate.apply(b,arguments);k(b.points,function(a){k([a.top,a.middle,a.bottom],
function(d,c){null!==d&&(a[e[c]]=b.yAxis.toPixels(d,!0))})})},drawGraph:function(){for(var b=this,e=b.points,a=e.length,d=b.options,c=b.graph,m={options:{gapSize:d.gapSize}},q=[[],[]],f;a--;)f=e[a],q[0].push({plotX:f.plotX,plotY:f.plotTop,isNull:f.isNull}),q[1].push({plotX:f.plotX,plotY:f.plotBottom,isNull:f.isNull});k(["topLine","bottomLine"],function(a,c){b.points=q[c];b.options=p(d[a].styles,m);b.graph=b["graph"+a];g.prototype.drawGraph.call(b);b["graph"+a]=b.graph});b.points=e;b.options=d;b.graph=
c;g.prototype.drawGraph.call(b)},getValues:function(b,e){var a=e.period,d=e.standardDeviation,c=b.xData,k=(b=b.yData)?b.length:0,l=[],f,h,n,p,v=[],w=[],t;if(c.length<a||!m(b[0])||4!==b[0].length)return!1;for(t=a;t<=k;t++){p=c.slice(t-a,t);h=b.slice(t-a,t);f=g.prototype.getValues.call(this,{xData:p,yData:h},e);p=f.xData[0];f=f.yData[0];n=0;for(var x=h.length,u=0;u<x;u++)n+=(h[u][3]-f)*(h[u][3]-f);n=Math.sqrt(n/(x-1));h=f+d*n;n=f-d*n;l.push([p,h,f,n]);v.push(p);w.push([h,f,n])}return{values:l,xData:v,
yData:w}}})})(k)});