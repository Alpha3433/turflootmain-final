exports.id=2406,exports.ids=[2406],exports.modules={98081:(e,t,o)=>{let i=o(89795),r=o(63591),n=o(25522),a=o(64288);function l(e,t,o,n,a){let l=[].slice.call(arguments,1),s=l.length,c="function"==typeof l[s-1];if(!c&&!i())throw Error("Callback required as last argument");if(c){if(s<2)throw Error("Too few arguments provided");2===s?(a=o,o=t,t=n=void 0):3===s&&(t.getContext&&void 0===a?(a=n,n=void 0):(a=n,n=o,o=t,t=void 0))}else{if(s<1)throw Error("Too few arguments provided");return 1===s?(o=t,t=n=void 0):2!==s||t.getContext||(n=o,o=t,t=void 0),new Promise(function(i,a){try{let a=r.create(o,n);i(e(a,t,n))}catch(e){a(e)}})}try{let i=r.create(o,n);a(null,e(i,t,n))}catch(e){a(e)}}r.create,t.toCanvas=l.bind(null,n.render),l.bind(null,n.renderToDataURL),l.bind(null,function(e,t,o){return a.render(e,o)})},89795:e=>{e.exports=function(){return"function"==typeof Promise&&Promise.prototype&&Promise.prototype.then}},84864:(e,t,o)=>{let i=o(86577).getSymbolSize;t.getRowColCoords=function(e){if(1===e)return[];let t=Math.floor(e/7)+2,o=i(e),r=145===o?26:2*Math.ceil((o-13)/(2*t-2)),n=[o-7];for(let e=1;e<t-1;e++)n[e]=n[e-1]-r;return n.push(6),n.reverse()},t.getPositions=function(e){let o=[],i=t.getRowColCoords(e),r=i.length;for(let e=0;e<r;e++)for(let t=0;t<r;t++)(0!==e||0!==t)&&(0!==e||t!==r-1)&&(e!==r-1||0!==t)&&o.push([i[e],i[t]]);return o}},88377:(e,t,o)=>{let i=o(62203),r=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function n(e){this.mode=i.ALPHANUMERIC,this.data=e}n.getBitsLength=function(e){return 11*Math.floor(e/2)+e%2*6},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){let t;for(t=0;t+2<=this.data.length;t+=2){let o=45*r.indexOf(this.data[t]);o+=r.indexOf(this.data[t+1]),e.put(o,11)}this.data.length%2&&e.put(r.indexOf(this.data[t]),6)},e.exports=n},62465:e=>{function t(){this.buffer=[],this.length=0}t.prototype={get:function(e){return(this.buffer[Math.floor(e/8)]>>>7-e%8&1)==1},put:function(e,t){for(let o=0;o<t;o++)this.putBit((e>>>t-o-1&1)==1)},getLengthInBits:function(){return this.length},putBit:function(e){let t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}},e.exports=t},27397:e=>{function t(e){if(!e||e<1)throw Error("BitMatrix size must be defined and greater than 0");this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}t.prototype.set=function(e,t,o,i){let r=e*this.size+t;this.data[r]=o,i&&(this.reservedBit[r]=!0)},t.prototype.get=function(e,t){return this.data[e*this.size+t]},t.prototype.xor=function(e,t,o){this.data[e*this.size+t]^=o},t.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]},e.exports=t},76349:(e,t,o)=>{let i=o(55402),r=o(62203);function n(e){this.mode=r.BYTE,"string"==typeof e&&(e=i(e)),this.data=new Uint8Array(e)}n.getBitsLength=function(e){return 8*e},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){for(let t=0,o=this.data.length;t<o;t++)e.put(this.data[t],8)},e.exports=n},20030:(e,t,o)=>{let i=o(58340),r=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],n=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];t.getBlocksCount=function(e,t){switch(t){case i.L:return r[(e-1)*4+0];case i.M:return r[(e-1)*4+1];case i.Q:return r[(e-1)*4+2];case i.H:return r[(e-1)*4+3];default:return}},t.getTotalCodewordsCount=function(e,t){switch(t){case i.L:return n[(e-1)*4+0];case i.M:return n[(e-1)*4+1];case i.Q:return n[(e-1)*4+2];case i.H:return n[(e-1)*4+3];default:return}}},58340:(e,t)=>{t.L={bit:1},t.M={bit:0},t.Q={bit:3},t.H={bit:2},t.isValid=function(e){return e&&void 0!==e.bit&&e.bit>=0&&e.bit<4},t.from=function(e,o){if(t.isValid(e))return e;try{return function(e){if("string"!=typeof e)throw Error("Param is not a string");switch(e.toLowerCase()){case"l":case"low":return t.L;case"m":case"medium":return t.M;case"q":case"quartile":return t.Q;case"h":case"high":return t.H;default:throw Error("Unknown EC Level: "+e)}}(e)}catch(e){return o}}},9795:(e,t,o)=>{let i=o(86577).getSymbolSize;t.getPositions=function(e){let t=i(e);return[[0,0],[t-7,0],[0,t-7]]}},43558:(e,t,o)=>{let i=o(86577),r=i.getBCHDigit(1335);t.getEncodedBits=function(e,t){let o=e.bit<<3|t,n=o<<10;for(;i.getBCHDigit(n)-r>=0;)n^=1335<<i.getBCHDigit(n)-r;return(o<<10|n)^21522}},43995:(e,t)=>{let o=new Uint8Array(512),i=new Uint8Array(256);(function(){let e=1;for(let t=0;t<255;t++)o[t]=e,i[e]=t,256&(e<<=1)&&(e^=285);for(let e=255;e<512;e++)o[e]=o[e-255]})(),t.log=function(e){if(e<1)throw Error("log("+e+")");return i[e]},t.exp=function(e){return o[e]},t.mul=function(e,t){return 0===e||0===t?0:o[i[e]+i[t]]}},18010:(e,t,o)=>{let i=o(62203),r=o(86577);function n(e){this.mode=i.KANJI,this.data=e}n.getBitsLength=function(e){return 13*e},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let o=r.toSJIS(this.data[t]);if(o>=33088&&o<=40956)o-=33088;else if(o>=57408&&o<=60351)o-=49472;else throw Error("Invalid SJIS character: "+this.data[t]+"\nMake sure your charset is UTF-8");o=(o>>>8&255)*192+(255&o),e.put(o,13)}},e.exports=n},1500:(e,t)=>{t.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};let o={N1:3,N2:3,N3:40,N4:10};t.isValid=function(e){return null!=e&&""!==e&&!isNaN(e)&&e>=0&&e<=7},t.from=function(e){return t.isValid(e)?parseInt(e,10):void 0},t.getPenaltyN1=function(e){let t=e.size,i=0,r=0,n=0,a=null,l=null;for(let s=0;s<t;s++){r=n=0,a=l=null;for(let c=0;c<t;c++){let t=e.get(s,c);t===a?r++:(r>=5&&(i+=o.N1+(r-5)),a=t,r=1),(t=e.get(c,s))===l?n++:(n>=5&&(i+=o.N1+(n-5)),l=t,n=1)}r>=5&&(i+=o.N1+(r-5)),n>=5&&(i+=o.N1+(n-5))}return i},t.getPenaltyN2=function(e){let t=e.size,i=0;for(let o=0;o<t-1;o++)for(let r=0;r<t-1;r++){let t=e.get(o,r)+e.get(o,r+1)+e.get(o+1,r)+e.get(o+1,r+1);(4===t||0===t)&&i++}return i*o.N2},t.getPenaltyN3=function(e){let t=e.size,i=0,r=0,n=0;for(let o=0;o<t;o++){r=n=0;for(let a=0;a<t;a++)r=r<<1&2047|e.get(o,a),a>=10&&(1488===r||93===r)&&i++,n=n<<1&2047|e.get(a,o),a>=10&&(1488===n||93===n)&&i++}return i*o.N3},t.getPenaltyN4=function(e){let t=0,i=e.data.length;for(let o=0;o<i;o++)t+=e.data[o];return Math.abs(Math.ceil(100*t/i/5)-10)*o.N4},t.applyMask=function(e,o){let i=o.size;for(let r=0;r<i;r++)for(let n=0;n<i;n++)o.isReserved(n,r)||o.xor(n,r,function(e,o,i){switch(e){case t.Patterns.PATTERN000:return(o+i)%2==0;case t.Patterns.PATTERN001:return o%2==0;case t.Patterns.PATTERN010:return i%3==0;case t.Patterns.PATTERN011:return(o+i)%3==0;case t.Patterns.PATTERN100:return(Math.floor(o/2)+Math.floor(i/3))%2==0;case t.Patterns.PATTERN101:return o*i%2+o*i%3==0;case t.Patterns.PATTERN110:return(o*i%2+o*i%3)%2==0;case t.Patterns.PATTERN111:return(o*i%3+(o+i)%2)%2==0;default:throw Error("bad maskPattern:"+e)}}(e,n,r))},t.getBestMask=function(e,o){let i=Object.keys(t.Patterns).length,r=0,n=1/0;for(let a=0;a<i;a++){o(a),t.applyMask(a,e);let i=t.getPenaltyN1(e)+t.getPenaltyN2(e)+t.getPenaltyN3(e)+t.getPenaltyN4(e);t.applyMask(a,e),i<n&&(n=i,r=a)}return r}},62203:(e,t,o)=>{let i=o(64214),r=o(22389);t.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},t.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},t.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},t.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},t.MIXED={bit:-1},t.getCharCountIndicator=function(e,t){if(!e.ccBits)throw Error("Invalid mode: "+e);if(!i.isValid(t))throw Error("Invalid version: "+t);return t>=1&&t<10?e.ccBits[0]:t<27?e.ccBits[1]:e.ccBits[2]},t.getBestModeForData=function(e){return r.testNumeric(e)?t.NUMERIC:r.testAlphanumeric(e)?t.ALPHANUMERIC:r.testKanji(e)?t.KANJI:t.BYTE},t.toString=function(e){if(e&&e.id)return e.id;throw Error("Invalid mode")},t.isValid=function(e){return e&&e.bit&&e.ccBits},t.from=function(e,o){if(t.isValid(e))return e;try{return function(e){if("string"!=typeof e)throw Error("Param is not a string");switch(e.toLowerCase()){case"numeric":return t.NUMERIC;case"alphanumeric":return t.ALPHANUMERIC;case"kanji":return t.KANJI;case"byte":return t.BYTE;default:throw Error("Unknown mode: "+e)}}(e)}catch(e){return o}}},18853:(e,t,o)=>{let i=o(62203);function r(e){this.mode=i.NUMERIC,this.data=e.toString()}r.getBitsLength=function(e){return 10*Math.floor(e/3)+(e%3?e%3*3+1:0)},r.prototype.getLength=function(){return this.data.length},r.prototype.getBitsLength=function(){return r.getBitsLength(this.data.length)},r.prototype.write=function(e){let t,o;for(t=0;t+3<=this.data.length;t+=3)o=parseInt(this.data.substr(t,3),10),e.put(o,10);let i=this.data.length-t;i>0&&(o=parseInt(this.data.substr(t),10),e.put(o,3*i+1))},e.exports=r},62701:(e,t,o)=>{let i=o(43995);t.mul=function(e,t){let o=new Uint8Array(e.length+t.length-1);for(let r=0;r<e.length;r++)for(let n=0;n<t.length;n++)o[r+n]^=i.mul(e[r],t[n]);return o},t.mod=function(e,t){let o=new Uint8Array(e);for(;o.length-t.length>=0;){let e=o[0];for(let r=0;r<t.length;r++)o[r]^=i.mul(t[r],e);let r=0;for(;r<o.length&&0===o[r];)r++;o=o.slice(r)}return o},t.generateECPolynomial=function(e){let o=new Uint8Array([1]);for(let r=0;r<e;r++)o=t.mul(o,new Uint8Array([1,i.exp(r)]));return o}},63591:(e,t,o)=>{let i=o(86577),r=o(58340),n=o(62465),a=o(27397),l=o(84864),s=o(9795),c=o(1500),d=o(20030),u=o(20726),h=o(93501),p=o(43558),g=o(62203),f=o(12583);function m(e,t,o){let i,r;let n=e.size,a=p.getEncodedBits(t,o);for(i=0;i<15;i++)r=(a>>i&1)==1,i<6?e.set(i,8,r,!0):i<8?e.set(i+1,8,r,!0):e.set(n-15+i,8,r,!0),i<8?e.set(8,n-i-1,r,!0):i<9?e.set(8,15-i-1+1,r,!0):e.set(8,15-i-1,r,!0);e.set(n-8,8,1,!0)}t.create=function(e,t){let o,p;if(void 0===e||""===e)throw Error("No input text");let w=r.M;return void 0!==t&&(w=r.from(t.errorCorrectionLevel,r.M),o=h.from(t.version),p=c.from(t.maskPattern),t.toSJISFunc&&i.setToSJISFunction(t.toSJISFunc)),function(e,t,o,r){let p;if(Array.isArray(e))p=f.fromArray(e);else if("string"==typeof e){let i=t;if(!i){let t=f.rawSplit(e);i=h.getBestVersionForData(t,o)}p=f.fromString(e,i||40)}else throw Error("Invalid data");let w=h.getBestVersionForData(p,o);if(!w)throw Error("The amount of data is too big to be stored in a QR Code");if(t){if(t<w)throw Error("\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: "+w+".\n")}else t=w;let b=function(e,t,o){let r=new n;o.forEach(function(t){r.put(t.mode.bit,4),r.put(t.getLength(),g.getCharCountIndicator(t.mode,e)),t.write(r)});let a=(i.getSymbolTotalCodewords(e)-d.getTotalCodewordsCount(e,t))*8;for(r.getLengthInBits()+4<=a&&r.put(0,4);r.getLengthInBits()%8!=0;)r.putBit(0);let l=(a-r.getLengthInBits())/8;for(let e=0;e<l;e++)r.put(e%2?17:236,8);return function(e,t,o){let r,n;let a=i.getSymbolTotalCodewords(t),l=a-d.getTotalCodewordsCount(t,o),s=d.getBlocksCount(t,o),c=a%s,h=s-c,p=Math.floor(a/s),g=Math.floor(l/s),f=g+1,m=p-g,w=new u(m),b=0,y=Array(s),v=Array(s),C=0,x=new Uint8Array(e.buffer);for(let e=0;e<s;e++){let t=e<h?g:f;y[e]=x.slice(b,b+t),v[e]=w.encode(y[e]),b+=t,C=Math.max(C,t)}let $=new Uint8Array(a),k=0;for(r=0;r<C;r++)for(n=0;n<s;n++)r<y[n].length&&($[k++]=y[n][r]);for(r=0;r<m;r++)for(n=0;n<s;n++)$[k++]=v[n][r];return $}(r,e,t)}(t,o,p),y=new a(i.getSymbolSize(t));return function(e,t){let o=e.size,i=s.getPositions(t);for(let t=0;t<i.length;t++){let r=i[t][0],n=i[t][1];for(let t=-1;t<=7;t++)if(!(r+t<=-1)&&!(o<=r+t))for(let i=-1;i<=7;i++)n+i<=-1||o<=n+i||(t>=0&&t<=6&&(0===i||6===i)||i>=0&&i<=6&&(0===t||6===t)||t>=2&&t<=4&&i>=2&&i<=4?e.set(r+t,n+i,!0,!0):e.set(r+t,n+i,!1,!0))}}(y,t),function(e){let t=e.size;for(let o=8;o<t-8;o++){let t=o%2==0;e.set(o,6,t,!0),e.set(6,o,t,!0)}}(y),function(e,t){let o=l.getPositions(t);for(let t=0;t<o.length;t++){let i=o[t][0],r=o[t][1];for(let t=-2;t<=2;t++)for(let o=-2;o<=2;o++)-2===t||2===t||-2===o||2===o||0===t&&0===o?e.set(i+t,r+o,!0,!0):e.set(i+t,r+o,!1,!0)}}(y,t),m(y,o,0),t>=7&&function(e,t){let o,i,r;let n=e.size,a=h.getEncodedBits(t);for(let t=0;t<18;t++)o=Math.floor(t/3),i=t%3+n-8-3,r=(a>>t&1)==1,e.set(o,i,r,!0),e.set(i,o,r,!0)}(y,t),function(e,t){let o=e.size,i=-1,r=o-1,n=7,a=0;for(let l=o-1;l>0;l-=2)for(6===l&&l--;;){for(let o=0;o<2;o++)if(!e.isReserved(r,l-o)){let i=!1;a<t.length&&(i=(t[a]>>>n&1)==1),e.set(r,l-o,i),-1==--n&&(a++,n=7)}if((r+=i)<0||o<=r){r-=i,i=-i;break}}}(y,b),isNaN(r)&&(r=c.getBestMask(y,m.bind(null,y,o))),c.applyMask(r,y),m(y,o,r),{modules:y,version:t,errorCorrectionLevel:o,maskPattern:r,segments:p}}(e,o,w,p)}},20726:(e,t,o)=>{let i=o(62701);function r(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}r.prototype.initialize=function(e){this.degree=e,this.genPoly=i.generateECPolynomial(this.degree)},r.prototype.encode=function(e){if(!this.genPoly)throw Error("Encoder not initialized");let t=new Uint8Array(e.length+this.degree);t.set(e);let o=i.mod(t,this.genPoly),r=this.degree-o.length;if(r>0){let e=new Uint8Array(this.degree);return e.set(o,r),e}return o},e.exports=r},22389:(e,t)=>{let o="[0-9]+",i="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+",r="(?:(?![A-Z0-9 $%*+\\-./:]|"+(i=i.replace(/u/g,"\\u"))+")(?:.|[\r\n]))+";t.KANJI=RegExp(i,"g"),t.BYTE_KANJI=RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),t.BYTE=RegExp(r,"g"),t.NUMERIC=RegExp(o,"g"),t.ALPHANUMERIC=RegExp("[A-Z $%*+\\-./:]+","g");let n=RegExp("^"+i+"$"),a=RegExp("^"+o+"$"),l=RegExp("^[A-Z0-9 $%*+\\-./:]+$");t.testKanji=function(e){return n.test(e)},t.testNumeric=function(e){return a.test(e)},t.testAlphanumeric=function(e){return l.test(e)}},12583:(e,t,o)=>{let i=o(62203),r=o(18853),n=o(88377),a=o(76349),l=o(18010),s=o(22389),c=o(86577),d=o(24414);function u(e){return unescape(encodeURIComponent(e)).length}function h(e,t,o){let i;let r=[];for(;null!==(i=e.exec(o));)r.push({data:i[0],index:i.index,mode:t,length:i[0].length});return r}function p(e){let t,o;let r=h(s.NUMERIC,i.NUMERIC,e),n=h(s.ALPHANUMERIC,i.ALPHANUMERIC,e);return c.isKanjiModeEnabled()?(t=h(s.BYTE,i.BYTE,e),o=h(s.KANJI,i.KANJI,e)):(t=h(s.BYTE_KANJI,i.BYTE,e),o=[]),r.concat(n,t,o).sort(function(e,t){return e.index-t.index}).map(function(e){return{data:e.data,mode:e.mode,length:e.length}})}function g(e,t){switch(t){case i.NUMERIC:return r.getBitsLength(e);case i.ALPHANUMERIC:return n.getBitsLength(e);case i.KANJI:return l.getBitsLength(e);case i.BYTE:return a.getBitsLength(e)}}function f(e,t){let o;let s=i.getBestModeForData(e);if((o=i.from(t,s))!==i.BYTE&&o.bit<s.bit)throw Error('"'+e+'" cannot be encoded with mode '+i.toString(o)+".\n Suggested mode is: "+i.toString(s));switch(o!==i.KANJI||c.isKanjiModeEnabled()||(o=i.BYTE),o){case i.NUMERIC:return new r(e);case i.ALPHANUMERIC:return new n(e);case i.KANJI:return new l(e);case i.BYTE:return new a(e)}}t.fromArray=function(e){return e.reduce(function(e,t){return"string"==typeof t?e.push(f(t,null)):t.data&&e.push(f(t.data,t.mode)),e},[])},t.fromString=function(e,o){let r=function(e,t){let o={},r={start:{}},n=["start"];for(let a=0;a<e.length;a++){let l=e[a],s=[];for(let e=0;e<l.length;e++){let c=l[e],d=""+a+e;s.push(d),o[d]={node:c,lastCount:0},r[d]={};for(let e=0;e<n.length;e++){let a=n[e];o[a]&&o[a].node.mode===c.mode?(r[a][d]=g(o[a].lastCount+c.length,c.mode)-g(o[a].lastCount,c.mode),o[a].lastCount+=c.length):(o[a]&&(o[a].lastCount=c.length),r[a][d]=g(c.length,c.mode)+4+i.getCharCountIndicator(c.mode,t))}}n=s}for(let e=0;e<n.length;e++)r[n[e]].end=0;return{map:r,table:o}}(function(e){let t=[];for(let o=0;o<e.length;o++){let r=e[o];switch(r.mode){case i.NUMERIC:t.push([r,{data:r.data,mode:i.ALPHANUMERIC,length:r.length},{data:r.data,mode:i.BYTE,length:r.length}]);break;case i.ALPHANUMERIC:t.push([r,{data:r.data,mode:i.BYTE,length:r.length}]);break;case i.KANJI:t.push([r,{data:r.data,mode:i.BYTE,length:u(r.data)}]);break;case i.BYTE:t.push([{data:r.data,mode:i.BYTE,length:u(r.data)}])}}return t}(p(e,c.isKanjiModeEnabled())),o),n=d.find_path(r.map,"start","end"),a=[];for(let e=1;e<n.length-1;e++)a.push(r.table[n[e]].node);return t.fromArray(a.reduce(function(e,t){let o=e.length-1>=0?e[e.length-1]:null;return o&&o.mode===t.mode?e[e.length-1].data+=t.data:e.push(t),e},[]))},t.rawSplit=function(e){return t.fromArray(p(e,c.isKanjiModeEnabled()))}},86577:(e,t)=>{let o;let i=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];t.getSymbolSize=function(e){if(!e)throw Error('"version" cannot be null or undefined');if(e<1||e>40)throw Error('"version" should be in range from 1 to 40');return 4*e+17},t.getSymbolTotalCodewords=function(e){return i[e]},t.getBCHDigit=function(e){let t=0;for(;0!==e;)t++,e>>>=1;return t},t.setToSJISFunction=function(e){if("function"!=typeof e)throw Error('"toSJISFunc" is not a valid function.');o=e},t.isKanjiModeEnabled=function(){return void 0!==o},t.toSJIS=function(e){return o(e)}},64214:(e,t)=>{t.isValid=function(e){return!isNaN(e)&&e>=1&&e<=40}},93501:(e,t,o)=>{let i=o(86577),r=o(20030),n=o(58340),a=o(62203),l=o(64214),s=i.getBCHDigit(7973);function c(e,t){return a.getCharCountIndicator(e,t)+4}t.from=function(e,t){return l.isValid(e)?parseInt(e,10):t},t.getCapacity=function(e,t,o){if(!l.isValid(e))throw Error("Invalid QR Code version");void 0===o&&(o=a.BYTE);let n=(i.getSymbolTotalCodewords(e)-r.getTotalCodewordsCount(e,t))*8;if(o===a.MIXED)return n;let s=n-c(o,e);switch(o){case a.NUMERIC:return Math.floor(s/10*3);case a.ALPHANUMERIC:return Math.floor(s/11*2);case a.KANJI:return Math.floor(s/13);case a.BYTE:default:return Math.floor(s/8)}},t.getBestVersionForData=function(e,o){let i;let r=n.from(o,n.M);if(Array.isArray(e)){if(e.length>1)return function(e,o){for(let i=1;i<=40;i++)if(function(e,t){let o=0;return e.forEach(function(e){let i=c(e.mode,t);o+=i+e.getBitsLength()}),o}(e,i)<=t.getCapacity(i,o,a.MIXED))return i}(e,r);if(0===e.length)return 1;i=e[0]}else i=e;return function(e,o,i){for(let r=1;r<=40;r++)if(o<=t.getCapacity(r,i,e))return r}(i.mode,i.getLength(),r)},t.getEncodedBits=function(e){if(!l.isValid(e)||e<7)throw Error("Invalid QR Code version");let t=e<<12;for(;i.getBCHDigit(t)-s>=0;)t^=7973<<i.getBCHDigit(t)-s;return e<<12|t}},93878:(e,t,o)=>{"use strict";e.exports=o(42867)},25522:(e,t,o)=>{let i=o(73122);t.render=function(e,t,o){var r;let n=o,a=t;void 0!==n||t&&t.getContext||(n=t,t=void 0),t||(a=function(){try{return document.createElement("canvas")}catch(e){throw Error("You need to specify a canvas element")}}()),n=i.getOptions(n);let l=i.getImageWidth(e.modules.size,n),s=a.getContext("2d"),c=s.createImageData(l,l);return i.qrToImageData(c.data,e,n),r=a,s.clearRect(0,0,r.width,r.height),r.style||(r.style={}),r.height=l,r.width=l,r.style.height=l+"px",r.style.width=l+"px",s.putImageData(c,0,0),a},t.renderToDataURL=function(e,o,i){let r=i;void 0!==r||o&&o.getContext||(r=o,o=void 0),r||(r={});let n=t.render(e,o,r),a=r.type||"image/png",l=r.rendererOpts||{};return n.toDataURL(a,l.quality)}},72929:(e,t,o)=>{let i=o(57147),r=o(81687).y,n=o(73122);t.render=function(e,t){let o=n.getOptions(t),i=o.rendererOpts,a=n.getImageWidth(e.modules.size,o);i.width=a,i.height=a;let l=new r(i);return n.qrToImageData(l.data,e,o),l},t.renderToDataURL=function(e,o,i){void 0===i&&(i=o,o=void 0),t.renderToBuffer(e,o,function(e,t){e&&i(e);let o="data:image/png;base64,";o+=t.toString("base64"),i(null,o)})},t.renderToBuffer=function(e,o,i){void 0===i&&(i=o,o=void 0);let r=t.render(e,o),n=[];r.on("error",i),r.on("data",function(e){n.push(e)}),r.on("end",function(){i(null,Buffer.concat(n))}),r.pack()},t.renderToFile=function(e,o,r,n){void 0===n&&(n=r,r=void 0);let a=!1,l=(...e)=>{a||(a=!0,n.apply(null,e))},s=i.createWriteStream(e);s.on("error",l),s.on("close",l),t.renderToFileStream(s,o,r)},t.renderToFileStream=function(e,o,i){t.render(o,i).pack().pipe(e)}},64288:(e,t,o)=>{let i=o(73122);function r(e,t){let o=e.a/255,i=t+'="'+e.hex+'"';return o<1?i+" "+t+'-opacity="'+o.toFixed(2).slice(1)+'"':i}function n(e,t,o){let i=e+t;return void 0!==o&&(i+=" "+o),i}t.render=function(e,t,o){let a=i.getOptions(t),l=e.modules.size,s=e.modules.data,c=l+2*a.margin,d=a.color.light.a?"<path "+r(a.color.light,"fill")+' d="M0 0h'+c+"v"+c+'H0z"/>':"",u="<path "+r(a.color.dark,"stroke")+' d="'+function(e,t,o){let i="",r=0,a=!1,l=0;for(let s=0;s<e.length;s++){let c=Math.floor(s%t),d=Math.floor(s/t);c||a||(a=!0),e[s]?(l++,s>0&&c>0&&e[s-1]||(i+=a?n("M",c+o,.5+d+o):n("m",r,0),r=0,a=!1),c+1<t&&e[s+1]||(i+=n("h",l),l=0)):r++}return i}(s,l,a.margin)+'"/>',h='<svg xmlns="http://www.w3.org/2000/svg" '+(a.width?'width="'+a.width+'" height="'+a.width+'" ':"")+('viewBox="0 0 '+c)+" "+c+'" shape-rendering="crispEdges">'+d+u+"</svg>\n";return"function"==typeof o&&o(null,h),h}},79314:(e,t,o)=>{let i=o(64288);t.render=i.render,t.renderToFile=function(e,i,r,n){void 0===n&&(n=r,r=void 0);let a=o(57147),l=t.render(i,r);a.writeFile(e,'<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'+l,n)}},798:(e,t,o)=>{let i=o(98488),r=o(78281);t.render=function(e,t,o){return t&&t.small?r.render(e,t,o):i.render(e,t,o)}},78281:(e,t)=>{let o="\x1b[37m",i="\x1b[30m",r="\x1b[0m",n="\x1b[47m"+i,a="\x1b[40m"+o,l=function(e,t,o,i){let r=t+1;return o>=r||i>=r||i<-1||o<-1?"0":o>=t||i>=t||i<0||o<0?"1":e[i*t+o]?"2":"1"},s=function(e,t,o,i){return l(e,t,o,i)+l(e,t,o,i+1)};t.render=function(e,t,l){var c,d;let u=e.modules.size,h=e.modules.data,p=!!(t&&t.inverse),g=t&&t.inverse?a:n,f={"00":r+" "+g,"01":r+(c=p?i:o)+"▄"+g,"02":r+(d=p?o:i)+"▄"+g,10:r+c+"▀"+g,11:" ",12:"▄",20:r+d+"▀"+g,21:"▀",22:"█"},m=r+"\n"+g,w=g;for(let e=-1;e<u+1;e+=2){for(let t=-1;t<u;t++)w+=f[s(h,u,t,e)];w+=f[s(h,u,u,e)]+m}return w+=r,"function"==typeof l&&l(null,w),w}},98488:(e,t)=>{t.render=function(e,t,o){let i=e.modules.size,r=e.modules.data,n="\x1b[47m  \x1b[0m",a="",l=Array(i+3).join(n),s=[,,].join(n);a+=l+"\n";for(let e=0;e<i;++e){a+=n;for(let t=0;t<i;t++)a+=r[e*i+t]?"\x1b[40m  \x1b[0m":n;a+=s+"\n"}return a+=l+"\n","function"==typeof o&&o(null,a),a}},97765:(e,t,o)=>{let i=o(73122),r={WW:" ",WB:"▄",BB:"█",BW:"▀"},n={BB:" ",BW:"▄",WW:"█",WB:"▀"};t.render=function(e,t,o){let a=i.getOptions(t),l=r;("#ffffff"===a.color.dark.hex||"#000000"===a.color.light.hex)&&(l=n);let s=e.modules.size,c=e.modules.data,d="",u=Array(s+2*a.margin+1).join(l.WW);u=Array(a.margin/2+1).join(u+"\n");let h=Array(a.margin+1).join(l.WW);d+=u;for(let e=0;e<s;e+=2){d+=h;for(let t=0;t<s;t++){var p;let o=c[e*s+t],i=c[(e+1)*s+t];d+=(p=l,o&&i?p.BB:o&&!i?p.BW:!o&&i?p.WB:p.WW)}d+=h+"\n"}return d+=u.slice(0,-1),"function"==typeof o&&o(null,d),d},t.renderToFile=function(e,i,r,n){void 0===n&&(n=r,r=void 0);let a=o(57147),l=t.render(i,r);a.writeFile(e,l,n)}},73122:(e,t)=>{function o(e){if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Color should be defined as hex string");let t=e.slice().replace("#","").split("");if(t.length<3||5===t.length||t.length>8)throw Error("Invalid hex color: "+e);(3===t.length||4===t.length)&&(t=Array.prototype.concat.apply([],t.map(function(e){return[e,e]}))),6===t.length&&t.push("F","F");let o=parseInt(t.join(""),16);return{r:o>>24&255,g:o>>16&255,b:o>>8&255,a:255&o,hex:"#"+t.slice(0,6).join("")}}t.getOptions=function(e){e||(e={}),e.color||(e.color={});let t=void 0===e.margin||null===e.margin||e.margin<0?4:e.margin,i=e.width&&e.width>=21?e.width:void 0,r=e.scale||4;return{width:i,scale:i?4:r,margin:t,color:{dark:o(e.color.dark||"#000000ff"),light:o(e.color.light||"#ffffffff")},type:e.type,rendererOpts:e.rendererOpts||{}}},t.getScale=function(e,t){return t.width&&t.width>=e+2*t.margin?t.width/(e+2*t.margin):t.scale},t.getImageWidth=function(e,o){let i=t.getScale(e,o);return Math.floor((e+2*o.margin)*i)},t.qrToImageData=function(e,o,i){let r=o.modules.size,n=o.modules.data,a=t.getScale(r,i),l=Math.floor((r+2*i.margin)*a),s=i.margin*a,c=[i.color.light,i.color.dark];for(let t=0;t<l;t++)for(let o=0;o<l;o++){let d=(t*l+o)*4,u=i.color.light;t>=s&&o>=s&&t<l-s&&o<l-s&&(u=c[n[Math.floor((t-s)/a)*r+Math.floor((o-s)/a)]?1:0]),e[d++]=u.r,e[d++]=u.g,e[d++]=u.b,e[d]=u.a}}},42867:(e,t,o)=>{let i=o(89795),r=o(63591),n=o(72929),a=o(97765),l=o(798),s=o(79314);function c(e,t,o){if(void 0===e)throw Error("String required as first argument");if(void 0===o&&(o=t,t={}),"function"!=typeof o){if(i())t=o||{},o=null;else throw Error("Callback required as last argument")}return{opts:t,cb:o}}function d(e){switch(e){case"svg":return s;case"txt":case"utf8":return a;default:return n}}function u(e,t,o){if(!o.cb)return new Promise(function(i,n){try{let a=r.create(t,o.opts);return e(a,o.opts,function(e,t){return e?n(e):i(t)})}catch(e){n(e)}});try{let i=r.create(t,o.opts);return e(i,o.opts,o.cb)}catch(e){o.cb(e)}}t.create=r.create,t.toCanvas=o(98081).toCanvas,t.toString=function(e,t,o){let i=c(e,t,o);return u(function(e){switch(e){case"svg":return s;case"terminal":return l;default:return a}}(i.opts?i.opts.type:void 0).render,e,i)},t.toDataURL=function(e,t,o){let i=c(e,t,o);return u(d(i.opts.type).renderToDataURL,e,i)},t.toBuffer=function(e,t,o){let i=c(e,t,o);return u(d(i.opts.type).renderToBuffer,e,i)},t.toFile=function(e,t,o,r){if("string"!=typeof e||!("string"==typeof t||"object"==typeof t))throw Error("Invalid argument");if(arguments.length<3&&!i())throw Error("Too few arguments provided");let n=c(t,o,r);return u(d(n.opts.type||e.slice((e.lastIndexOf(".")-1>>>0)+2).toLowerCase()).renderToFile.bind(null,e),t,n)},t.toFileStream=function(e,t,o){if(arguments.length<2)throw Error("Too few arguments provided");let i=c(t,o,e.emit.bind(e,"error"));u(d("png").renderToFileStream.bind(null,e),t,i)}},55402:e=>{"use strict";e.exports=function(e){for(var t=[],o=e.length,i=0;i<o;i++){var r=e.charCodeAt(i);if(r>=55296&&r<=56319&&o>i+1){var n=e.charCodeAt(i+1);n>=56320&&n<=57343&&(r=(r-55296)*1024+n-56320+65536,i+=1)}if(r<128){t.push(r);continue}if(r<2048){t.push(r>>6|192),t.push(63&r|128);continue}if(r<55296||r>=57344&&r<65536){t.push(r>>12|224),t.push(r>>6&63|128),t.push(63&r|128);continue}if(r>=65536&&r<=1114111){t.push(r>>18|240),t.push(r>>12&63|128),t.push(r>>6&63|128),t.push(63&r|128);continue}t.push(239,191,189)}return new Uint8Array(t).buffer}},12406:(e,t,o)=>{"use strict";o.r(t),o.d(t,{W3mAllWalletsView:()=>tW,W3mConnectingWcBasicView:()=>e3,W3mDownloadsView:()=>tH});var i=o(37207),r=o(9829),n=o(34862),a=o(24594),l=o(28488),s=o(71878),c=o(23783);o(64559);var d=o(83479),u=o(64895),h=o(9346),p=o(35190),g=o(77870),f=o(14212);o(35300),o(10062),o(43926);var m=o(10820),w=o(18322);o(68865);var b=o(30955);let y=(0,b.iv)`
  :host {
    position: relative;
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host([data-image='true']) {
    background-color: transparent;
  }

  :host > wui-flex {
    overflow: hidden;
    border-radius: inherit;
    border-radius: var(--local-border-radius);
  }

  :host([data-size='sm']) {
    width: 32px;
    height: 32px;
  }

  :host([data-size='md']) {
    width: 40px;
    height: 40px;
  }

  :host([data-size='lg']) {
    width: 56px;
    height: 56px;
  }

  :host([name='Extension'])::after {
    border: 1px solid ${({colors:e})=>e.accent010};
  }

  :host([data-wallet-icon='allWallets'])::after {
    border: 1px solid ${({colors:e})=>e.accent010};
  }

  wui-icon[data-parent-size='inherit'] {
    width: 75%;
    height: 75%;
    align-items: center;
  }

  wui-icon[data-parent-size='sm'] {
    width: 32px;
    height: 32px;
  }

  wui-icon[data-parent-size='md'] {
    width: 40px;
    height: 40px;
  }

  :host > wui-icon-box {
    position: absolute;
    overflow: hidden;
    right: -1px;
    bottom: -2px;
    z-index: 1;
    border: 2px solid ${({tokens:e})=>e.theme.backgroundPrimary};
    padding: 1px;
  }
`;var v=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let C=class extends i.oi{constructor(){super(...arguments),this.size="md",this.name="",this.installed=!1,this.badgeSize="xs"}render(){let e="1";return"lg"===this.size?e="4":"md"===this.size?e="2":"sm"===this.size&&(e="1"),this.style.cssText=`
       --local-border-radius: var(--apkt-borderRadius-${e});
   `,this.dataset.size=this.size,this.imageSrc&&(this.dataset.image="true"),this.walletIcon&&(this.dataset.walletIcon=this.walletIcon),(0,i.dy)`
      <wui-flex justifyContent="center" alignItems="center"> ${this.templateVisual()} </wui-flex>
    `}templateVisual(){return this.imageSrc?(0,i.dy)`<wui-image src=${this.imageSrc} alt=${this.name}></wui-image>`:this.walletIcon?(0,i.dy)`<wui-icon size="md" color="default" name=${this.walletIcon}></wui-icon>`:(0,i.dy)`<wui-icon
      data-parent-size=${this.size}
      size="inherit"
      color="inherit"
      name="wallet"
    ></wui-icon>`}};C.styles=[m.ET,y],v([(0,r.Cb)()],C.prototype,"size",void 0),v([(0,r.Cb)()],C.prototype,"name",void 0),v([(0,r.Cb)()],C.prototype,"imageSrc",void 0),v([(0,r.Cb)()],C.prototype,"walletIcon",void 0),v([(0,r.Cb)({type:Boolean})],C.prototype,"installed",void 0),v([(0,r.Cb)()],C.prototype,"badgeSize",void 0),C=v([(0,w.M)("wui-wallet-image")],C);let x=(0,b.iv)`
  :host {
    position: relative;
    border-radius: ${({borderRadius:e})=>e[2]};
    width: 40px;
    height: 40px;
    overflow: hidden;
    background: ${({tokens:e})=>e.theme.foregroundPrimary};
    display: flex;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    column-gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[1]};
  }

  :host > wui-wallet-image {
    width: 14px;
    height: 14px;
    border-radius: 2px;
  }
`;var $=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let k=class extends i.oi{constructor(){super(...arguments),this.walletImages=[]}render(){let e=this.walletImages.length<4;return(0,i.dy)`${this.walletImages.slice(0,4).map(({src:e,walletName:t})=>(0,i.dy)`
          <wui-wallet-image
            size="sm"
            imageSrc=${e}
            name=${(0,d.o)(t)}
          ></wui-wallet-image>
        `)}
    ${e?[...Array(4-this.walletImages.length)].map(()=>(0,i.dy)` <wui-wallet-image size="sm" name=""></wui-wallet-image>`):null} `}};k.styles=[m.ET,x],$([(0,r.Cb)({type:Array})],k.prototype,"walletImages",void 0),k=$([(0,w.M)("wui-all-wallets-image")],k),o(47155);let R=(0,b.iv)`
  :host {
    width: 100%;
  }

  button {
    column-gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  button > wui-wallet-image {
    background: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button > wui-text:nth-child(2) {
    display: flex;
    flex: 1;
  }

  button:hover:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button[data-all-wallets='true'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button[data-all-wallets='true']:hover:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  button:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  button:disabled {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:disabled > wui-tag {
    background-color: ${({tokens:e})=>e.core.glass010};
    color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }
`;var E=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let I=class extends i.oi{constructor(){super(...arguments),this.walletImages=[],this.imageSrc="",this.name="",this.size="md",this.tabIdx=void 0,this.disabled=!1,this.showAllWallets=!1,this.loading=!1,this.loadingSpinnerColor="accent-100"}render(){return this.dataset.size=this.size,(0,i.dy)`
      <button
        ?disabled=${this.disabled}
        data-all-wallets=${this.showAllWallets}
        tabindex=${(0,d.o)(this.tabIdx)}
      >
        ${this.templateAllWallets()} ${this.templateWalletImage()}
        <wui-text variant="lg-regular" color="inherit">${this.name}</wui-text>
        ${this.templateStatus()}
      </button>
    `}templateAllWallets(){return this.showAllWallets&&this.imageSrc?(0,i.dy)` <wui-all-wallets-image .imageeSrc=${this.imageSrc}> </wui-all-wallets-image> `:this.showAllWallets&&this.walletIcon?(0,i.dy)` <wui-wallet-image .walletIcon=${this.walletIcon} size="sm"> </wui-wallet-image> `:null}templateWalletImage(){return!this.showAllWallets&&this.imageSrc?(0,i.dy)`<wui-wallet-image
        size=${(0,d.o)("sm"===this.size?"sm":"md")}
        imageSrc=${this.imageSrc}
        name=${this.name}
      ></wui-wallet-image>`:this.showAllWallets||this.imageSrc?null:(0,i.dy)`<wui-wallet-image size="sm" name=${this.name}></wui-wallet-image>`}templateStatus(){return this.loading?(0,i.dy)`<wui-loading-spinner size="lg" color="accent-primary"></wui-loading-spinner>`:this.tagLabel&&this.tagVariant?(0,i.dy)`<wui-tag size="sm" variant=${this.tagVariant}>${this.tagLabel}</wui-tag>`:null}};I.styles=[m.ET,m.ZM,R],E([(0,r.Cb)({type:Array})],I.prototype,"walletImages",void 0),E([(0,r.Cb)()],I.prototype,"imageSrc",void 0),E([(0,r.Cb)()],I.prototype,"name",void 0),E([(0,r.Cb)()],I.prototype,"size",void 0),E([(0,r.Cb)()],I.prototype,"tagLabel",void 0),E([(0,r.Cb)()],I.prototype,"tagVariant",void 0),E([(0,r.Cb)()],I.prototype,"walletIcon",void 0),E([(0,r.Cb)()],I.prototype,"tabIdx",void 0),E([(0,r.Cb)({type:Boolean})],I.prototype,"disabled",void 0),E([(0,r.Cb)({type:Boolean})],I.prototype,"showAllWallets",void 0),E([(0,r.Cb)({type:Boolean})],I.prototype,"loading",void 0),E([(0,r.Cb)({type:String})],I.prototype,"loadingSpinnerColor",void 0),I=E([(0,w.M)("wui-list-wallet")],I);var S=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let T=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.count=l.ApiController.state.count,this.filteredCount=l.ApiController.state.filteredWallets.length,this.isFetchingRecommendedWallets=l.ApiController.state.isFetchingRecommendedWallets,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e),l.ApiController.subscribeKey("count",e=>this.count=e),l.ApiController.subscribeKey("filteredWallets",e=>this.filteredCount=e.length),l.ApiController.subscribeKey("isFetchingRecommendedWallets",e=>this.isFetchingRecommendedWallets=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.connectors.find(e=>"walletConnect"===e.id),{allWallets:t}=a.OptionsController.state;if(!e||"HIDE"===t||"ONLY_MOBILE"===t&&!n.j.isMobile())return null;let o=l.ApiController.state.featured.length,r=this.count+o,s=this.filteredCount>0?this.filteredCount:r<10?r:10*Math.floor(r/10),c=`${s}`;this.filteredCount>0?c=`${this.filteredCount}`:s<r&&(c=`${s}+`);let h=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT);return(0,i.dy)`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${c}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${(0,d.o)(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${h}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){g.X.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),f.RouterController.push("AllWallets")}};S([(0,r.Cb)()],T.prototype,"tabIdx",void 0),S([(0,r.SB)()],T.prototype,"connectors",void 0),S([(0,r.SB)()],T.prototype,"count",void 0),S([(0,r.SB)()],T.prototype,"filteredCount",void 0),S([(0,r.SB)()],T.prototype,"isFetchingRecommendedWallets",void 0),T=S([(0,c.Mo)("w3m-all-wallets-widget")],T);var A=o(98673),P=o(61573),B=o(980),O=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let j=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.connections=p.ConnectionController.state.connections,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e),p.ConnectionController.subscribeKey("connections",e=>this.connections=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.connectors.filter(e=>"ANNOUNCED"===e.type);return e?.length?(0,i.dy)`
      <wui-flex flexDirection="column" gap="2">
        ${e.filter(B.C.showConnector).map(e=>{let t=(this.connections.get(e.chain)??[]).some(t=>P.g.isLowerCaseMatch(t.connectorId,e.id));return(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(A.f.getConnectorImage(e))}
              name=${e.name??"Unknown"}
              @click=${()=>this.onConnector(e)}
              tagVariant=${t?"info":"success"}
              tagLabel=${t?"connected":"installed"}
              size="sm"
              data-testid=${`wallet-selector-${e.id}`}
              .installed=${!0}
              tabIdx=${(0,d.o)(this.tabIdx)}
            >
            </wui-list-wallet>
          `})}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnector(e){"walletConnect"===e.id?n.j.isMobile()?f.RouterController.push("AllWallets"):f.RouterController.push("ConnectingWalletConnect"):f.RouterController.push("ConnectingExternal",{connector:e})}};O([(0,r.Cb)()],j.prototype,"tabIdx",void 0),O([(0,r.SB)()],j.prototype,"connectors",void 0),O([(0,r.SB)()],j.prototype,"connections",void 0),j=O([(0,c.Mo)("w3m-connect-announced-widget")],j);var L=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let z=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.loading=!1,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e)),n.j.isTelegram()&&n.j.isIos()&&(this.loading=!p.ConnectionController.state.wcUri,this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",e=>this.loading=!e)))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{customWallets:e}=a.OptionsController.state;if(!e?.length)return this.style.cssText="display: none",null;let t=this.filterOutDuplicateWallets(e),o=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT);return(0,i.dy)`<wui-flex flexDirection="column" gap="2">
      ${t.map(e=>(0,i.dy)`
          <wui-list-wallet
            imageSrc=${(0,d.o)(A.f.getWalletImage(e))}
            name=${e.name??"Unknown"}
            @click=${()=>this.onConnectWallet(e)}
            size="sm"
            data-testid=${`wallet-selector-${e.id}`}
            tabIdx=${(0,d.o)(this.tabIdx)}
            ?loading=${this.loading}
            ?disabled=${o}
          >
          </wui-list-wallet>
        `)}
    </wui-flex>`}filterOutDuplicateWallets(e){let t=s.M.getRecentWallets(),o=this.connectors.map(e=>e.info?.rdns).filter(Boolean),i=t.map(e=>e.rdns).filter(Boolean),r=o.concat(i);if(r.includes("io.metamask.mobile")&&n.j.isMobile()){let e=r.indexOf("io.metamask.mobile");r[e]="io.metamask"}return e.filter(e=>!r.includes(String(e?.rdns)))}onConnectWallet(e){this.loading||f.RouterController.push("ConnectingWalletConnect",{wallet:e})}};L([(0,r.Cb)()],z.prototype,"tabIdx",void 0),L([(0,r.SB)()],z.prototype,"connectors",void 0),L([(0,r.SB)()],z.prototype,"loading",void 0),z=L([(0,c.Mo)("w3m-connect-custom-widget")],z);var M=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let N=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.connectors.filter(e=>"EXTERNAL"===e.type).filter(B.C.showConnector).filter(e=>e.id!==u.b.CONNECTOR_ID.COINBASE_SDK);if(!e?.length)return this.style.cssText="display: none",null;let t=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT);return(0,i.dy)`
      <wui-flex flexDirection="column" gap="2">
        ${e.map(e=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(A.f.getConnectorImage(e))}
              .installed=${!0}
              name=${e.name??"Unknown"}
              data-testid=${`wallet-selector-external-${e.id}`}
              size="sm"
              @click=${()=>this.onConnector(e)}
              tabIdx=${(0,d.o)(this.tabIdx)}
              ?disabled=${t}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `}onConnector(e){f.RouterController.push("ConnectingExternal",{connector:e})}};M([(0,r.Cb)()],N.prototype,"tabIdx",void 0),M([(0,r.SB)()],N.prototype,"connectors",void 0),N=M([(0,c.Mo)("w3m-connect-external-widget")],N);var W=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let D=class extends i.oi{constructor(){super(...arguments),this.tabIdx=void 0,this.wallets=[]}render(){if(!this.wallets.length)return this.style.cssText="display: none",null;let e=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT);return(0,i.dy)`
      <wui-flex flexDirection="column" gap="2">
        ${this.wallets.map(t=>(0,i.dy)`
            <wui-list-wallet
              data-testid=${`wallet-selector-featured-${t.id}`}
              imageSrc=${(0,d.o)(A.f.getWalletImage(t))}
              name=${t.name??"Unknown"}
              @click=${()=>this.onConnectWallet(t)}
              tabIdx=${(0,d.o)(this.tabIdx)}
              size="sm"
              ?disabled=${e}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `}onConnectWallet(e){h.ConnectorController.selectWalletConnector(e)}};W([(0,r.Cb)()],D.prototype,"tabIdx",void 0),W([(0,r.Cb)()],D.prototype,"wallets",void 0),D=W([(0,c.Mo)("w3m-connect-featured-widget")],D);var U=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let _=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=[],this.connections=p.ConnectionController.state.connections,this.unsubscribe.push(p.ConnectionController.subscribeKey("connections",e=>this.connections=e))}render(){let e=this.connectors.filter(B.C.showConnector);return 0===e.length?(this.style.cssText="display: none",null):(0,i.dy)`
      <wui-flex flexDirection="column" gap="2">
        ${e.map(e=>{let t=(this.connections.get(e.chain)??[]).some(t=>P.g.isLowerCaseMatch(t.connectorId,e.id));return(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(A.f.getConnectorImage(e))}
              .installed=${!0}
              name=${e.name??"Unknown"}
              tagVariant=${t?"info":"success"}
              tagLabel=${t?"connected":"installed"}
              data-testid=${`wallet-selector-${e.id}`}
              size="sm"
              @click=${()=>this.onConnector(e)}
              tabIdx=${(0,d.o)(this.tabIdx)}
            >
            </wui-list-wallet>
          `})}
      </wui-flex>
    `}onConnector(e){h.ConnectorController.setActiveConnector(e),f.RouterController.push("ConnectingExternal",{connector:e})}};U([(0,r.Cb)()],_.prototype,"tabIdx",void 0),U([(0,r.Cb)()],_.prototype,"connectors",void 0),U([(0,r.SB)()],_.prototype,"connections",void 0),_=U([(0,c.Mo)("w3m-connect-injected-widget")],_);var H=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let F=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.connectors.filter(e=>"MULTI_CHAIN"===e.type&&"WalletConnect"!==e.name);return e?.length?(0,i.dy)`
      <wui-flex flexDirection="column" gap="2">
        ${e.map(e=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(A.f.getConnectorImage(e))}
              .installed=${!0}
              name=${e.name??"Unknown"}
              tagVariant="info"
              tagLabel="multichain"
              data-testid=${`wallet-selector-${e.id}`}
              size="sm"
              @click=${()=>this.onConnector(e)}
              tabIdx=${(0,d.o)(this.tabIdx)}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `:(this.style.cssText="display: none",null)}onConnector(e){h.ConnectorController.setActiveConnector(e),f.RouterController.push("ConnectingMultiChain")}};H([(0,r.Cb)()],F.prototype,"tabIdx",void 0),H([(0,r.SB)()],F.prototype,"connectors",void 0),F=H([(0,c.Mo)("w3m-connect-multi-chain-widget")],F);var K=o(42772),q=o(42339),V=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let Y=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.loading=!1,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e)),n.j.isTelegram()&&n.j.isIos()&&(this.loading=!p.ConnectionController.state.wcUri,this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",e=>this.loading=!e)))}render(){let e=s.M.getRecentWallets().filter(e=>!q.J.isExcluded(e)).filter(e=>!this.hasWalletConnector(e)).filter(e=>this.isWalletCompatibleWithCurrentChain(e));if(!e.length)return this.style.cssText="display: none",null;let t=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT);return(0,i.dy)`
      <wui-flex flexDirection="column" gap="2">
        ${e.map(e=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(A.f.getWalletImage(e))}
              name=${e.name??"Unknown"}
              @click=${()=>this.onConnectWallet(e)}
              tagLabel="recent"
              tagVariant="info"
              size="sm"
              tabIdx=${(0,d.o)(this.tabIdx)}
              ?loading=${this.loading}
              ?disabled=${t}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `}onConnectWallet(e){this.loading||h.ConnectorController.selectWalletConnector(e)}hasWalletConnector(e){return this.connectors.some(t=>t.id===e.id||t.name===e.name)}isWalletCompatibleWithCurrentChain(e){let t=K.R.state.activeChain;return!t||!e.chains||e.chains.some(e=>t===e.split(":")[0])}};V([(0,r.Cb)()],Y.prototype,"tabIdx",void 0),V([(0,r.SB)()],Y.prototype,"connectors",void 0),V([(0,r.SB)()],Y.prototype,"loading",void 0),Y=V([(0,c.Mo)("w3m-connect-recent-widget")],Y);var J=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let X=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.wallets=[],this.loading=!1,n.j.isTelegram()&&n.j.isIos()&&(this.loading=!p.ConnectionController.state.wcUri,this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",e=>this.loading=!e)))}render(){let{connectors:e}=h.ConnectorController.state,{customWallets:t,featuredWalletIds:o}=a.OptionsController.state,r=s.M.getRecentWallets(),n=e.find(e=>"walletConnect"===e.id),l=e.filter(e=>"INJECTED"===e.type||"ANNOUNCED"===e.type||"MULTI_CHAIN"===e.type).filter(e=>"Browser Wallet"!==e.name);if(!n)return null;if(o||t||!this.wallets.length)return this.style.cssText="display: none",null;let c=l.length+r.length,g=q.J.filterOutDuplicateWallets(this.wallets).slice(0,Math.max(0,2-c));if(!g.length)return this.style.cssText="display: none",null;let f=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT);return(0,i.dy)`
      <wui-flex flexDirection="column" gap="2">
        ${g.map(e=>(0,i.dy)`
            <wui-list-wallet
              imageSrc=${(0,d.o)(A.f.getWalletImage(e))}
              name=${e?.name??"Unknown"}
              @click=${()=>this.onConnectWallet(e)}
              size="sm"
              tabIdx=${(0,d.o)(this.tabIdx)}
              ?loading=${this.loading}
              ?disabled=${f}
            >
            </wui-list-wallet>
          `)}
      </wui-flex>
    `}onConnectWallet(e){if(this.loading)return;let t=h.ConnectorController.getConnector({id:e.id,rdns:e.rdns});t?f.RouterController.push("ConnectingExternal",{connector:t}):f.RouterController.push("ConnectingWalletConnect",{wallet:e})}};J([(0,r.Cb)()],X.prototype,"tabIdx",void 0),J([(0,r.Cb)()],X.prototype,"wallets",void 0),J([(0,r.SB)()],X.prototype,"loading",void 0),X=J([(0,c.Mo)("w3m-connect-recommended-widget")],X);var G=o(58488),Q=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let Z=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.connectorImages=G.W.state.connectorImages,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e),G.W.subscribeKey("connectorImages",e=>this.connectorImages=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(n.j.isMobile())return this.style.cssText="display: none",null;let e=this.connectors.find(e=>"walletConnect"===e.id);if(!e)return this.style.cssText="display: none",null;let t=e.imageUrl||this.connectorImages[e?.imageId??""],o=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT);return(0,i.dy)`
      <wui-list-wallet
        imageSrc=${(0,d.o)(t)}
        name=${e.name??"Unknown"}
        @click=${()=>this.onConnector(e)}
        tagLabel="qr code"
        tagVariant="accent"
        tabIdx=${(0,d.o)(this.tabIdx)}
        data-testid="wallet-selector-walletconnect"
        size="sm"
        ?disabled=${o}
      >
      </wui-list-wallet>
    `}onConnector(e){h.ConnectorController.setActiveConnector(e),f.RouterController.push("ConnectingWalletConnect")}};Q([(0,r.Cb)()],Z.prototype,"tabIdx",void 0),Q([(0,r.SB)()],Z.prototype,"connectors",void 0),Q([(0,r.SB)()],Z.prototype,"connectorImages",void 0),Z=Q([(0,c.Mo)("w3m-connect-walletconnect-widget")],Z);let ee=(0,c.iv)`
  :host {
    margin-top: ${({spacing:e})=>e["1"]};
  }
  wui-separator {
    margin: ${({spacing:e})=>e["3"]} calc(${({spacing:e})=>e["3"]} * -1)
      ${({spacing:e})=>e["2"]} calc(${({spacing:e})=>e["3"]} * -1);
    width: calc(100% + ${({spacing:e})=>e["3"]} * 2);
  }
`;var et=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let eo=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.recommended=l.ApiController.state.recommended,this.featured=l.ApiController.state.featured,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e),l.ApiController.subscribeKey("recommended",e=>this.recommended=e),l.ApiController.subscribeKey("featured",e=>this.featured=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return(0,i.dy)`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}connectorListTemplate(){let{custom:e,recent:t,announced:o,injected:r,multiChain:n,recommended:a,featured:l,external:s}=B.C.getConnectorsByType(this.connectors,this.recommended,this.featured);return B.C.getConnectorTypeOrder({custom:e,recent:t,announced:o,injected:r,multiChain:n,recommended:a,featured:l,external:s}).map(e=>{switch(e){case"injected":return(0,i.dy)`
            ${n.length?(0,i.dy)`<w3m-connect-multi-chain-widget
                  tabIdx=${(0,d.o)(this.tabIdx)}
                ></w3m-connect-multi-chain-widget>`:null}
            ${o.length?(0,i.dy)`<w3m-connect-announced-widget
                  tabIdx=${(0,d.o)(this.tabIdx)}
                ></w3m-connect-announced-widget>`:null}
            ${r.length?(0,i.dy)`<w3m-connect-injected-widget
                  .connectors=${r}
                  tabIdx=${(0,d.o)(this.tabIdx)}
                ></w3m-connect-injected-widget>`:null}
          `;case"walletConnect":return(0,i.dy)`<w3m-connect-walletconnect-widget
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-walletconnect-widget>`;case"recent":return(0,i.dy)`<w3m-connect-recent-widget
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-recent-widget>`;case"featured":return(0,i.dy)`<w3m-connect-featured-widget
            .wallets=${l}
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-featured-widget>`;case"custom":return(0,i.dy)`<w3m-connect-custom-widget
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-custom-widget>`;case"external":return(0,i.dy)`<w3m-connect-external-widget
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-external-widget>`;case"recommended":return(0,i.dy)`<w3m-connect-recommended-widget
            .wallets=${a}
            tabIdx=${(0,d.o)(this.tabIdx)}
          ></w3m-connect-recommended-widget>`;default:return console.warn(`Unknown connector type: ${e}`),null}})}};eo.styles=ee,et([(0,r.Cb)()],eo.prototype,"tabIdx",void 0),et([(0,r.SB)()],eo.prototype,"connectors",void 0),et([(0,r.SB)()],eo.prototype,"recommended",void 0),et([(0,r.SB)()],eo.prototype,"featured",void 0),eo=et([(0,c.Mo)("w3m-connector-list")],eo);var ei=o(61741),er=o(905),en=o(23637);let ea=(0,b.iv)`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    column-gap: ${({spacing:e})=>e[1]};
    color: ${({tokens:e})=>e.theme.textSecondary};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({tokens:e})=>e.theme.textPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({tokens:e})=>e.theme.textPrimary};
    }
  }
`;var el=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let es={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},ec={lg:"md",md:"sm",sm:"sm"},ed=class extends i.oi{constructor(){super(...arguments),this.icon="mobile",this.size="md",this.label="",this.active=!1}render(){return(0,i.dy)`
      <button data-active=${this.active}>
        ${this.icon?(0,i.dy)`<wui-icon size=${ec[this.size]} name=${this.icon}></wui-icon>`:""}
        <wui-text variant=${es[this.size]}> ${this.label} </wui-text>
      </button>
    `}};ed.styles=[m.ET,m.ZM,ea],el([(0,r.Cb)()],ed.prototype,"icon",void 0),el([(0,r.Cb)()],ed.prototype,"size",void 0),el([(0,r.Cb)()],ed.prototype,"label",void 0),el([(0,r.Cb)({type:Boolean})],ed.prototype,"active",void 0),ed=el([(0,w.M)("wui-tab-item")],ed);let eu=(0,b.iv)`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[32]};
    padding: ${({spacing:e})=>e["01"]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`;var eh=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let ep=class extends i.oi{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size="md",this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((e,t)=>{let o=t===this.activeTab;return(0,i.dy)`
        <wui-tab-item
          @click=${()=>this.onTabClick(t)}
          icon=${e.icon}
          size=${this.size}
          label=${e.label}
          ?active=${o}
          data-active=${o}
          data-testid="tab-${e.label?.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(e){this.activeTab=e,this.onTabChange(e)}};ep.styles=[m.ET,m.ZM,eu],eh([(0,r.Cb)({type:Array})],ep.prototype,"tabs",void 0),eh([(0,r.Cb)()],ep.prototype,"onTabChange",void 0),eh([(0,r.Cb)()],ep.prototype,"size",void 0),eh([(0,r.SB)()],ep.prototype,"activeTab",void 0),ep=eh([(0,w.M)("wui-tabs")],ep);var eg=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let ef=class extends i.oi{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.generateTabs();return(0,i.dy)`
      <wui-flex justifyContent="center" .padding=${["0","0","4","0"]}>
        <wui-tabs .tabs=${e} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){let e=this.platforms.map(e=>"browser"===e?{label:"Browser",icon:"extension",platform:"browser"}:"mobile"===e?{label:"Mobile",icon:"mobile",platform:"mobile"}:"qrcode"===e?{label:"Mobile",icon:"mobile",platform:"qrcode"}:"web"===e?{label:"Webapp",icon:"browser",platform:"web"}:"desktop"===e?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=e.map(({platform:e})=>e),e}onTabChange(e){let t=this.platformTabs[e];t&&this.onSelectPlatfrom?.(t)}};eg([(0,r.Cb)({type:Array})],ef.prototype,"platforms",void 0),eg([(0,r.Cb)()],ef.prototype,"onSelectPlatfrom",void 0),ef=eg([(0,c.Mo)("w3m-connecting-header")],ef);var em=o(71106);o(72227);let ew=(0,b.iv)`
  :host {
    width: var(--local-width);
  }

  button {
    width: var(--local-width);
    white-space: nowrap;
    column-gap: ${({spacing:e})=>e[2]};
    transition:
      scale ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: scale, background-color, border-radius;
    cursor: pointer;
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='sm'] {
    border-radius: ${({borderRadius:e})=>e[2]};
    padding: 0 ${({spacing:e})=>e[2]};
    height: 28px;
  }

  button[data-size='md'] {
    border-radius: ${({borderRadius:e})=>e[3]};
    padding: 0 ${({spacing:e})=>e[4]};
    height: 38px;
  }

  button[data-size='lg'] {
    border-radius: ${({borderRadius:e})=>e[4]};
    padding: 0 ${({spacing:e})=>e[5]};
    height: 48px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-variant='accent-primary'] {
    background-color: ${({tokens:e})=>e.core.backgroundAccentPrimary};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='accent-secondary'] {
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button[data-variant='neutral-primary'] {
    background-color: ${({tokens:e})=>e.theme.backgroundInvert};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='neutral-secondary'] {
    background-color: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  button[data-variant='neutral-tertiary'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  button[data-variant='error-primary'] {
    background-color: ${({tokens:e})=>e.core.textError};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  button[data-variant='error-secondary'] {
    background-color: ${({tokens:e})=>e.core.backgroundError};
    color: ${({tokens:e})=>e.core.textError};
  }

  button[data-variant='shade'] {
    background: var(--wui-color-gray-glass-002);
    color: var(--wui-color-fg-200);
    border: none;
    box-shadow: inset 0 0 0 1px var(--wui-color-gray-glass-005);
  }

  /* -- Focus states --------------------------------------------------- */
  button[data-size='sm']:focus-visible:enabled {
    border-radius: 28px;
  }

  button[data-size='md']:focus-visible:enabled {
    border-radius: 38px;
  }

  button[data-size='lg']:focus-visible:enabled {
    border-radius: 48px;
  }
  button[data-variant='shade']:focus-visible:enabled {
    background: var(--wui-color-gray-glass-005);
    box-shadow:
      inset 0 0 0 1px var(--wui-color-gray-glass-010),
      0 0 0 4px var(--wui-color-gray-glass-002);
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) {
    button[data-size='sm']:hover:enabled {
      border-radius: 28px;
    }

    button[data-size='md']:hover:enabled {
      border-radius: 38px;
    }

    button[data-size='lg']:hover:enabled {
      border-radius: 48px;
    }

    button[data-variant='shade']:hover:enabled {
      background: var(--wui-color-gray-glass-002);
    }

    button[data-variant='shade']:active:enabled {
      background: var(--wui-color-gray-glass-005);
    }
  }

  button[data-size='sm']:active:enabled {
    border-radius: 28px;
  }

  button[data-size='md']:active:enabled {
    border-radius: 38px;
  }

  button[data-size='lg']:active:enabled {
    border-radius: 48px;
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    opacity: 0.3;
  }
`;var eb=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let ey={lg:"lg-regular-mono",md:"md-regular-mono",sm:"sm-regular-mono"},ev={lg:"md",md:"md",sm:"sm"},eC=class extends i.oi{constructor(){super(...arguments),this.size="lg",this.disabled=!1,this.fullWidth=!1,this.loading=!1,this.variant="accent-primary"}render(){this.style.cssText=`
    --local-width: ${this.fullWidth?"100%":"auto"};
     `;let e=this.textVariant??ey[this.size];return(0,i.dy)`
      <button data-variant=${this.variant} data-size=${this.size} ?disabled=${this.disabled}>
        ${this.loadingTemplate()}
        <slot name="iconLeft"></slot>
        <wui-text variant=${e} color="inherit">
          <slot></slot>
        </wui-text>
        <slot name="iconRight"></slot>
      </button>
    `}loadingTemplate(){if(this.loading){let e=ev[this.size],t="neutral-primary"===this.variant||"accent-primary"===this.variant?"invert":"primary";return(0,i.dy)`<wui-loading-spinner color=${t} size=${e}></wui-loading-spinner>`}return null}};eC.styles=[m.ET,m.ZM,ew],eb([(0,r.Cb)()],eC.prototype,"size",void 0),eb([(0,r.Cb)({type:Boolean})],eC.prototype,"disabled",void 0),eb([(0,r.Cb)({type:Boolean})],eC.prototype,"fullWidth",void 0),eb([(0,r.Cb)({type:Boolean})],eC.prototype,"loading",void 0),eb([(0,r.Cb)()],eC.prototype,"variant",void 0),eb([(0,r.Cb)()],eC.prototype,"textVariant",void 0),eC=eb([(0,w.M)("wui-button")],eC),o(98855),o(2427);let ex=(0,b.iv)`
  :host {
    display: block;
    width: 100px;
    height: 100px;
  }

  svg {
    width: 100px;
    height: 100px;
  }

  rect {
    fill: none;
    stroke: ${e=>e.colors.accent100};
    stroke-width: 3px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;var e$=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let ek=class extends i.oi{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){let e=this.radius>50?50:this.radius,t=36-e;return(0,i.dy)`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${e}
          stroke-dasharray="${116+t} ${245+t}"
          stroke-dashoffset=${360+1.75*t}
        />
      </svg>
    `}};ek.styles=[m.ET,ex],e$([(0,r.Cb)({type:Number})],ek.prototype,"radius",void 0),ek=e$([(0,w.M)("wui-loading-thumbnail")],ek),o(44680),o(69834);let eR=(0,b.iv)`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding-left: ${({spacing:e})=>e[3]};
    padding-right: ${({spacing:e})=>e[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[6]};
  }

  wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`;var eE=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let eI=class extends i.oi{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return(0,i.dy)`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};eI.styles=[m.ET,m.ZM,eR],eE([(0,r.Cb)({type:Boolean})],eI.prototype,"disabled",void 0),eE([(0,r.Cb)()],eI.prototype,"label",void 0),eE([(0,r.Cb)()],eI.prototype,"buttonLabel",void 0),eI=eE([(0,w.M)("wui-cta-button")],eI);let eS=(0,c.iv)`
  :host {
    display: block;
    padding: 0 ${({spacing:e})=>e["5"]} ${({spacing:e})=>e["5"]};
  }
`;var eT=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let eA=class extends i.oi{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;let{name:e,app_store:t,play_store:o,chrome_store:r,homepage:a}=this.wallet,l=n.j.isMobile(),s=n.j.isIos(),d=n.j.isAndroid(),u=[t,o,a,r].filter(Boolean).length>1,h=c.Hg.getTruncateString({string:e,charsStart:12,charsEnd:0,truncate:"end"});return u&&!l?(0,i.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${()=>f.RouterController.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!u&&a?(0,i.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:t&&s?(0,i.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:o&&d?(0,i.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){this.wallet?.app_store&&n.j.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&n.j.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&n.j.openHref(this.wallet.homepage,"_blank")}};eA.styles=[eS],eT([(0,r.Cb)({type:Object})],eA.prototype,"wallet",void 0),eA=eT([(0,c.Mo)("w3m-mobile-download-links")],eA);let eP=(0,c.iv)`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:e})=>e["1"]} * -1);
    bottom: calc(${({spacing:e})=>e["1"]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({durations:e})=>e.lg};
    transition-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:e})=>e["4"]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:e})=>e["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`;var eB=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};class eO extends i.oi{constructor(){super(),this.wallet=f.RouterController.state.data?.wallet,this.connector=f.RouterController.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=A.f.getWalletImage(this.wallet)??A.f.getConnectorImage(this.connector),this.name=this.wallet?.name??this.connector?.name??"Wallet",this.isRetrying=!1,this.uri=p.ConnectionController.state.wcUri,this.error=p.ConnectionController.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",e=>{this.uri=e,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),p.ConnectionController.subscribeKey("wcError",e=>this.error=e)),(n.j.isTelegram()||n.j.isSafari())&&n.j.isIos()&&p.ConnectionController.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),p.ConnectionController.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();let e=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel,t="";return this.label?t=this.label:(t=`Continue in ${this.name}`,this.error&&(t="Connection declined")),(0,i.dy)`
      <wui-flex
        data-error=${(0,d.o)(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${(0,d.o)(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["2","0","0","0"]}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error?"error":"primary"}>
            ${t}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${e}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?(0,i.dy)`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying||this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              `:null}
      </wui-flex>

      ${this.isWalletConnect?(0,i.dy)`
              <wui-flex .padding=${["0","5","5","5"]} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `}onShowRetry(){if(this.error&&!this.showRetry){this.showRetry=!0;let e=this.shadowRoot?.querySelector("wui-button");e?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"})}}onTryAgain(){p.ConnectionController.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){let e=em.ThemeController.state.themeVariables["--w3m-border-radius-master"],t=e?parseInt(e.replace("px",""),10):4;return(0,i.dy)`<wui-loading-thumbnail radius=${9*t}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(n.j.copyToClopboard(this.uri),ei.SnackController.showSuccess("Link copied"))}catch{ei.SnackController.showError("Failed to copy")}}}eO.styles=eP,eB([(0,r.SB)()],eO.prototype,"isRetrying",void 0),eB([(0,r.SB)()],eO.prototype,"uri",void 0),eB([(0,r.SB)()],eO.prototype,"error",void 0),eB([(0,r.SB)()],eO.prototype,"ready",void 0),eB([(0,r.SB)()],eO.prototype,"showRetry",void 0),eB([(0,r.SB)()],eO.prototype,"label",void 0),eB([(0,r.SB)()],eO.prototype,"secondaryBtnLabel",void 0),eB([(0,r.SB)()],eO.prototype,"secondaryLabel",void 0),eB([(0,r.SB)()],eO.prototype,"isLoading",void 0),eB([(0,r.Cb)({type:Boolean})],eO.prototype,"isMobile",void 0),eB([(0,r.Cb)()],eO.prototype,"onRetry",void 0);let ej=class extends eO{constructor(){if(super(),!this.wallet)throw Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),g.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index}})}async onConnectProxy(){try{this.error=!1;let{connectors:e}=h.ConnectorController.state,t=e.find(e=>"ANNOUNCED"===e.type&&e.info?.rdns===this.wallet?.rdns||"INJECTED"===e.type||e.name===this.wallet?.name);if(t)await p.ConnectionController.connectExternal(t,t.chain);else throw Error("w3m-connecting-wc-browser: No connector found");er.I.close(),g.X.sendEvent({type:"track",event:"CONNECT_SUCCESS",properties:{method:"browser",name:this.wallet?.name||"Unknown"}})}catch(e){g.X.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:e?.message??"Unknown"}}),this.error=!0}}};ej=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a}([(0,c.Mo)("w3m-connecting-wc-browser")],ej);let eL=class extends eO{constructor(){if(super(),!this.wallet)throw Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),g.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop",displayIndex:this.wallet?.display_index}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;let{desktop_link:e,name:t}=this.wallet,{redirect:o,href:i}=n.j.formatNativeUrl(e,this.uri);p.ConnectionController.setWcLinking({name:t,href:i}),p.ConnectionController.setRecentWallet(this.wallet),n.j.openHref(o,"_blank")}catch{this.error=!0}}};eL=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a}([(0,c.Mo)("w3m-connecting-wc-desktop")],eL);var ez=o(16114),eM=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let eN=class extends eO{constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=a.OptionsController.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{if(this.wallet?.mobile_link&&this.uri)try{this.error=!1;let{mobile_link:e,link_mode:t,name:o}=this.wallet,{redirect:i,redirectUniversalLink:r,href:a}=n.j.formatNativeUrl(e,this.uri,t);this.redirectDeeplink=i,this.redirectUniversalLink=r,this.target=n.j.isIframe()?"_top":"_self",p.ConnectionController.setWcLinking({name:o,href:a}),p.ConnectionController.setRecentWallet(this.wallet),this.preferUniversalLinks&&this.redirectUniversalLink?n.j.openHref(this.redirectUniversalLink,this.target):n.j.openHref(this.redirectDeeplink,this.target)}catch(e){g.X.sendEvent({type:"track",event:"CONNECT_PROXY_ERROR",properties:{message:e instanceof Error?e.message:"Error parsing the deeplink",uri:this.uri,mobile_link:this.wallet.mobile_link,name:this.wallet.name}}),this.error=!0}},!this.wallet)throw Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=ez.bq.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",()=>{this.onHandleURI()})),g.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile",displayIndex:this.wallet?.display_index}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){p.ConnectionController.setWcError(!1),this.onConnect?.()}};eM([(0,r.SB)()],eN.prototype,"redirectDeeplink",void 0),eM([(0,r.SB)()],eN.prototype,"redirectUniversalLink",void 0),eM([(0,r.SB)()],eN.prototype,"target",void 0),eM([(0,r.SB)()],eN.prototype,"preferUniversalLinks",void 0),eM([(0,r.SB)()],eN.prototype,"isLoading",void 0),eN=eM([(0,c.Mo)("w3m-connecting-wc-mobile")],eN);var eW=o(93878);function eD(e,t,o){return e!==t&&(e-t<0?t-e:e-t)<=o+.1}let eU={generate({uri:e,size:t,logoSize:o,padding:r=8,dotColor:n="var(--apkt-tokens-theme-textInvert)"}){let a=[],l=function(e,t){let o=Array.prototype.slice.call(eW.create(e,{errorCorrectionLevel:"Q"}).modules.data,0),i=Math.sqrt(o.length);return o.reduce((e,t,o)=>(o%i==0?e.push([t]):e[e.length-1].push(t))&&e,[])}(e,0),s=(t-2*r)/l.length,c=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];c.forEach(({x:e,y:t})=>{let o=(l.length-7)*s*e+r,d=(l.length-7)*s*t+r;for(let e=0;e<c.length;e+=1){let t=s*(7-2*e);a.push((0,i.YP)`
            <rect
              fill=${2===e?"var(--apkt-tokens-theme-textInvert)":"var(--apkt-tokens-theme-textPrimary)"}
              width=${0===e?t-10:t}
              rx= ${0===e?(t-10)*.45:.45*t}
              ry= ${0===e?(t-10)*.45:.45*t}
              stroke=${n}
              stroke-width=${0===e?10:0}
              height=${0===e?t-10:t}
              x= ${0===e?d+s*e+5:d+s*e}
              y= ${0===e?o+s*e+5:o+s*e}
            />
          `)}});let d=Math.floor((o+25)/s),u=l.length/2-d/2,h=l.length/2+d/2-1,p=[];l.forEach((e,t)=>{e.forEach((e,o)=>{!l[t][o]||t<7&&o<7||t>l.length-8&&o<7||t<7&&o>l.length-8||t>u&&t<h&&o>u&&o<h||p.push([t*s+s/2+r,o*s+s/2+r])})});let g={};return p.forEach(([e,t])=>{g[e]?g[e]?.push(t):g[e]=[t]}),Object.entries(g).map(([e,t])=>{let o=t.filter(e=>t.every(t=>!eD(e,t,s)));return[Number(e),o]}).forEach(([e,t])=>{t.forEach(t=>{a.push((0,i.YP)`<circle cx=${e} cy=${t} fill=${n} r=${s/2.5} />`)})}),Object.entries(g).filter(([e,t])=>t.length>1).map(([e,t])=>{let o=t.filter(e=>t.some(t=>eD(e,t,s)));return[Number(e),o]}).map(([e,t])=>{t.sort((e,t)=>e<t?-1:1);let o=[];for(let e of t){let t=o.find(t=>t.some(t=>eD(e,t,s)));t?t.push(e):o.push([e])}return[e,o.map(e=>[e[0],e[e.length-1]])]}).forEach(([e,t])=>{t.forEach(([t,o])=>{a.push((0,i.YP)`
              <line
                x1=${e}
                x2=${e}
                y1=${t}
                y2=${o}
                stroke=${n}
                stroke-width=${s/1.25}
                stroke-linecap="round"
              />
            `)})}),a}},e_=(0,b.iv)`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    background-color: ${({tokens:e})=>e.theme.backgroundInvert};
    color: ${({tokens:e})=>e.theme.textInvert};
  }

  :host {
    border-radius: ${({borderRadius:e})=>e[4]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    box-shadow: inset 0 0 0 4px ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[6]};
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: #3396ff !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }

  wui-icon > svg {
    width: inherit;
    height: inherit;
  }
`;var eH=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let eF=class extends i.oi{constructor(){super(...arguments),this.uri="",this.size=0,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),this.style.cssText=`--local-size: ${this.size}px`,(0,i.dy)`<wui-flex
      alignItems="center"
      justifyContent="center"
      class="wui-qr-code"
      direction="column"
      gap="4"
      width="100%"
      style="height: 100%"
    >
      ${this.templateVisual()} ${this.templateSvg()}
    </wui-flex>`}templateSvg(){return(0,i.YP)`
      <svg height=${this.size} width=${this.size}>
        ${eU.generate({uri:this.uri,size:this.size,logoSize:this.arenaClear?0:this.size/4})}
      </svg>
    `}templateVisual(){return this.imageSrc?(0,i.dy)`<wui-image src=${this.imageSrc} alt=${this.alt??"logo"}></wui-image>`:this.farcaster?(0,i.dy)`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:(0,i.dy)`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};eF.styles=[m.ET,e_],eH([(0,r.Cb)()],eF.prototype,"uri",void 0),eH([(0,r.Cb)({type:Number})],eF.prototype,"size",void 0),eH([(0,r.Cb)()],eF.prototype,"theme",void 0),eH([(0,r.Cb)()],eF.prototype,"imageSrc",void 0),eH([(0,r.Cb)()],eF.prototype,"alt",void 0),eH([(0,r.Cb)({type:Boolean})],eF.prototype,"arenaClear",void 0),eH([(0,r.Cb)({type:Boolean})],eF.prototype,"farcaster",void 0),eF=eH([(0,w.M)("wui-qr-code")],eF);let eK=(0,b.iv)`
  :host {
    display: block;
    background: linear-gradient(
      90deg,
      ${({tokens:e})=>e.theme.foregroundSecondary} 0%,
      ${({tokens:e})=>e.theme.foregroundTertiary} 50%,
      ${({tokens:e})=>e.theme.foregroundSecondary} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1s ease-in-out infinite;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host([data-rounded='true']) {
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;var eq=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let eV=class extends i.oi{constructor(){super(...arguments),this.width="",this.height="",this.variant="default",this.rounded=!1}render(){return this.style.cssText=`
      width: ${this.width};
      height: ${this.height};
    `,this.dataset.rounded=this.rounded?"true":"false",(0,i.dy)`<slot></slot>`}};eV.styles=[eK],eq([(0,r.Cb)()],eV.prototype,"width",void 0),eq([(0,r.Cb)()],eV.prototype,"height",void 0),eq([(0,r.Cb)()],eV.prototype,"variant",void 0),eq([(0,r.Cb)({type:Boolean})],eV.prototype,"rounded",void 0),eV=eq([(0,w.M)("wui-shimmer")],eV),o(80311);let eY=(0,c.iv)`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`,eJ=class extends eO{constructor(){super(),this.forceUpdate=()=>{this.requestUpdate()},window.addEventListener("resize",this.forceUpdate),g.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet?.name??"WalletConnect",platform:"qrcode",displayIndex:this.wallet?.display_index}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(e=>e()),window.removeEventListener("resize",this.forceUpdate)}render(){return this.onRenderProxy(),(0,i.dy)`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0","5","5","5"]}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.timeout=setTimeout(()=>{this.ready=!0},200))}qrCodeTemplate(){if(!this.uri||!this.ready)return null;let e=this.getBoundingClientRect().width-40,t=this.wallet?this.wallet.name:void 0;return p.ConnectionController.setWcLinking(void 0),p.ConnectionController.setRecentWallet(this.wallet),(0,i.dy)` <wui-qr-code
      size=${e}
      theme=${em.ThemeController.state.themeMode}
      uri=${this.uri}
      imageSrc=${(0,d.o)(A.f.getWalletImage(this.wallet))}
      color=${(0,d.o)(em.ThemeController.state.themeVariables["--w3m-qr-color"])}
      alt=${(0,d.o)(t)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){let e=!this.uri||!this.ready;return(0,i.dy)`<wui-button
      .disabled=${e}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`}};eJ.styles=eY,eJ=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a}([(0,c.Mo)("w3m-connecting-wc-qrcode")],eJ);let eX=class extends i.oi{constructor(){if(super(),this.wallet=f.RouterController.state.data?.wallet,!this.wallet)throw Error("w3m-connecting-wc-unsupported: No wallet provided");g.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index}})}render(){return(0,i.dy)`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${(0,d.o)(A.f.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};eX=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a}([(0,c.Mo)("w3m-connecting-wc-unsupported")],eX);var eG=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let eQ=class extends eO{constructor(){if(super(),this.isLoading=!0,!this.wallet)throw Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=ez.bq.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",()=>{this.updateLoadingState()})),g.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web",displayIndex:this.wallet?.display_index}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;let{webapp_link:e,name:t}=this.wallet,{redirect:o,href:i}=n.j.formatUniversalUrl(e,this.uri);p.ConnectionController.setWcLinking({name:t,href:i}),p.ConnectionController.setRecentWallet(this.wallet),n.j.openHref(o,"_blank")}catch{this.error=!0}}};eG([(0,r.SB)()],eQ.prototype,"isLoading",void 0),eQ=eG([(0,c.Mo)("w3m-connecting-wc-web")],eQ);var eZ=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let e0=class extends i.oi{constructor(){super(),this.wallet=f.RouterController.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!a.OptionsController.state.siwx,this.remoteFeatures=a.OptionsController.state.remoteFeatures,this.displayBranding=!0,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(a.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return(0,i.dy)`
      ${this.headerTemplate()}
      <div>${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding&&this.displayBranding?(0,i.dy)`<wui-ux-by-reown></wui-ux-by-reown>`:null}async initializeConnection(e=!1){if("browser"!==this.platform&&(!a.OptionsController.state.manualWCControl||e))try{let{wcPairingExpiry:t,status:o}=p.ConnectionController.state;if(e||a.OptionsController.state.enableEmbedded||n.j.isPairingExpired(t)||"connecting"===o){let e=p.ConnectionController.getConnections(K.R.state.activeChain),t=this.remoteFeatures?.multiWallet,o=e.length>0;await p.ConnectionController.connectWalletConnect({cache:"never"}),this.isSiwxEnabled||(o&&t?(f.RouterController.replace("ProfileWallets"),ei.SnackController.showSuccess("New Wallet Added")):er.I.close())}}catch(e){if(e instanceof Error&&e.message.includes("An error occurred when attempting to switch chain")&&!a.OptionsController.state.enableNetworkSwitch&&K.R.state.activeChain){K.R.setActiveCaipNetwork(en.f.getUnsupportedNetwork(`${K.R.state.activeChain}:${K.R.state.activeCaipNetwork?.id}`)),K.R.showUnsupportedChainUI();return}g.X.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:e?.message??"Unknown"}}),p.ConnectionController.setWcError(!0),ei.SnackController.showError(e.message??"Connection error"),p.ConnectionController.resetWcConnection(),f.RouterController.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;let{mobile_link:e,desktop_link:t,webapp_link:o,injected:i,rdns:r}=this.wallet,l=i?.map(({injected_id:e})=>e).filter(Boolean),s=[...r?[r]:l??[]],c=!a.OptionsController.state.isUniversalProvider&&s.length,d=p.ConnectionController.checkInstalled(s),u=c&&d,h=t&&!n.j.isMobile();u&&!K.R.state.noAdapters&&this.platforms.push("browser"),e&&this.platforms.push(n.j.isMobile()?"mobile":"qrcode"),o&&this.platforms.push("web"),h&&this.platforms.push("desktop"),u||!c||K.R.state.noAdapters||this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return(0,i.dy)`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return(0,i.dy)`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return(0,i.dy)`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return(0,i.dy)`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return(0,i.dy)`<w3m-connecting-wc-qrcode></w3m-connecting-wc-qrcode>`;default:return(0,i.dy)`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?(0,i.dy)`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(e){let t=this.shadowRoot?.querySelector("div");t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=e,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};eZ([(0,r.SB)()],e0.prototype,"platform",void 0),eZ([(0,r.SB)()],e0.prototype,"platforms",void 0),eZ([(0,r.SB)()],e0.prototype,"isSiwxEnabled",void 0),eZ([(0,r.SB)()],e0.prototype,"remoteFeatures",void 0),eZ([(0,r.Cb)({type:Boolean})],e0.prototype,"displayBranding",void 0),e0=eZ([(0,c.Mo)("w3m-connecting-wc-view")],e0);var e1=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let e3=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.isMobile=n.j.isMobile(),this.remoteFeatures=a.OptionsController.state.remoteFeatures,this.unsubscribe.push(a.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(this.isMobile){let{featured:e,recommended:t}=l.ApiController.state,{customWallets:o}=a.OptionsController.state,r=s.M.getRecentWallets(),n=e.length||t.length||o?.length||r.length;return(0,i.dy)`<wui-flex flexDirection="column" gap="2" .margin=${["1","3","3","3"]}>
        ${n?(0,i.dy)`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return(0,i.dy)`<wui-flex flexDirection="column" .padding=${["0","0","4","0"]}>
        <w3m-connecting-wc-view .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0","3","0","3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?(0,i.dy)` <wui-flex flexDirection="column" .padding=${["1","0","1","0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};e1([(0,r.SB)()],e3.prototype,"isMobile",void 0),e1([(0,r.SB)()],e3.prototype,"remoteFeatures",void 0),e3=e1([(0,c.Mo)("w3m-connecting-wc-basic-view")],e3);var e2=o(53927);/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let{I:e4}=e2._$LH,e5=e=>void 0===e.strings;var e8=o(63331);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let e6=(e,t)=>{let o=e._$AN;if(void 0===o)return!1;for(let e of o)e._$AO?.(t,!1),e6(e,t);return!0},e7=e=>{let t,o;do{if(void 0===(t=e._$AM))break;(o=t._$AN).delete(e),e=t}while(0===o?.size)},e9=e=>{for(let t;t=e._$AM;e=t){let o=t._$AN;if(void 0===o)t._$AN=o=new Set;else if(o.has(e))break;o.add(e),to(t)}};function te(e){void 0!==this._$AN?(e7(this),this._$AM=e,e9(this)):this._$AM=e}function tt(e,t=!1,o=0){let i=this._$AH,r=this._$AN;if(void 0!==r&&0!==r.size){if(t){if(Array.isArray(i))for(let e=o;e<i.length;e++)e6(i[e],!1),e7(i[e]);else null!=i&&(e6(i,!1),e7(i))}else e6(this,e)}}let to=e=>{e.type==e8.pX.CHILD&&(e._$AP??=tt,e._$AQ??=te)};class ti extends e8.Xe{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,t,o){super._$AT(e,t,o),e9(this),this.isConnected=e._$AU}_$AO(e,t=!0){e!==this.isConnected&&(this.isConnected=e,e?this.reconnected?.():this.disconnected?.()),t&&(e6(this,e),e7(this))}setValue(e){if(e5(this._$Ct))this._$Ct._$AI(e,this);else{let t=[...this._$Ct._$AH];t[this._$Ci]=e,this._$Ct._$AI(t,this,0)}}disconnected(){}reconnected(){}}/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let tr=()=>new tn;class tn{}let ta=new WeakMap,tl=(0,e8.XM)(class extends ti{render(e){return e2.Ld}update(e,[t]){let o=t!==this.G;return o&&void 0!==this.G&&this.rt(void 0),(o||this.lt!==this.ct)&&(this.G=t,this.ht=e.options?.host,this.rt(this.ct=e.element)),e2.Ld}rt(e){if(this.isConnected||(e=void 0),"function"==typeof this.G){let t=this.ht??globalThis,o=ta.get(t);void 0===o&&(o=new WeakMap,ta.set(t,o)),void 0!==o.get(this.G)&&this.G.call(this.ht,void 0),o.set(this.G,e),void 0!==e&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return"function"==typeof this.G?ta.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}}),ts=(0,b.iv)`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({colors:e})=>e.neutrals300};
    border-radius: ${({borderRadius:e})=>e.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({colors:e})=>e.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    background-color: ${({tokens:e})=>e.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({colors:e})=>e.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({tokens:e})=>e.theme.textTertiary};
  }
`;var tc=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let td=class extends i.oi{constructor(){super(...arguments),this.inputElementRef=tr(),this.checked=!1,this.disabled=!1,this.size="md"}render(){return(0,i.dy)`
      <label data-size=${this.size}>
        <input
          ${tl(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("switchChange",{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};td.styles=[m.ET,m.ZM,ts],tc([(0,r.Cb)({type:Boolean})],td.prototype,"checked",void 0),tc([(0,r.Cb)({type:Boolean})],td.prototype,"disabled",void 0),tc([(0,r.Cb)()],td.prototype,"size",void 0),td=tc([(0,w.M)("wui-toggle")],td);let tu=(0,b.iv)`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({spacing:e})=>e["2"]};
    padding: ${({spacing:e})=>e["2"]} ${({spacing:e})=>e["3"]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e["4"]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;var th=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let tp=class extends i.oi{constructor(){super(...arguments),this.checked=!1}render(){return(0,i.dy)`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(e){e.stopPropagation(),this.checked=e.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("certifiedSwitchChange",{detail:this.checked,bubbles:!0,composed:!0}))}};tp.styles=[m.ET,m.ZM,tu],th([(0,r.Cb)({type:Boolean})],tp.prototype,"checked",void 0),tp=th([(0,w.M)("wui-certified-switch")],tp);let tg=(0,b.iv)`
  :host {
    position: relative;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    gap: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.textPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  .wui-input-text-container {
    position: relative;
    display: flex;
  }

  input {
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: inherit;
    background: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[3]} ${({spacing:e})=>e[10]};
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
  }

  input[data-size='lg'] {
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[4]} ${({spacing:e})=>e[10]};
  }

  @media (hover: hover) and (pointer: fine) {
    input:hover:enabled {
      border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    }
  }

  input:disabled {
    cursor: unset;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  input::placeholder {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  input:focus:enabled {
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    -webkit-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    -moz-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  div.wui-input-text-container:has(input:disabled) {
    opacity: 0.5;
  }

  wui-icon.wui-input-text-left-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    left: ${({spacing:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button.wui-input-text-submit-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: ${({borderRadius:e})=>e[2]};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button.wui-input-text-submit-button:disabled {
    opacity: 1;
  }

  button.wui-input-text-submit-button.loading wui-icon {
    animation: spin 1s linear infinite;
  }

  button.wui-input-text-submit-button:hover {
    background: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  input:has(+ .wui-input-text-submit-button) {
    padding-right: ${({spacing:e})=>e[12]};
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input[type='search']::-webkit-search-decoration,
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-results-button,
  input[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  /* -- Keyframes --------------------------------------------------- */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;var tf=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let tm=class extends i.oi{constructor(){super(...arguments),this.inputElementRef=tr(),this.disabled=!1,this.loading=!1,this.placeholder="",this.type="text",this.value="",this.size="md"}render(){return(0,i.dy)` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${tl(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${(0,d.o)(this.enterKeyHint)}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder}
          @input=${this.dispatchInputChangeEvent.bind(this)}
          @keydown=${this.onKeyDown}
          .value=${this.value||""}
        />
        ${this.templateSubmitButton()}
        <slot class="wui-input-text-slot"></slot>
      </div>
      ${this.templateError()} ${this.templateWarning()}`}templateLeftIcon(){return this.icon?(0,i.dy)`<wui-icon
        class="wui-input-text-left-icon"
        size="md"
        data-size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}templateSubmitButton(){return this.onSubmit?(0,i.dy)`<button
        class="wui-input-text-submit-button ${this.loading?"loading":""}"
        @click=${this.onSubmit?.bind(this)}
        ?disabled=${this.disabled||this.loading}
      >
        ${this.loading?(0,i.dy)`<wui-icon name="spinner" size="md"></wui-icon>`:(0,i.dy)`<wui-icon name="chevronRight" size="md"></wui-icon>`}
      </button>`:null}templateError(){return this.errorText?(0,i.dy)`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`:null}templateWarning(){return this.warningText?(0,i.dy)`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`:null}dispatchInputChangeEvent(){this.dispatchEvent(new CustomEvent("inputChange",{detail:this.inputElementRef.value?.value,bubbles:!0,composed:!0}))}};tm.styles=[m.ET,m.ZM,tg],tf([(0,r.Cb)()],tm.prototype,"icon",void 0),tf([(0,r.Cb)({type:Boolean})],tm.prototype,"disabled",void 0),tf([(0,r.Cb)({type:Boolean})],tm.prototype,"loading",void 0),tf([(0,r.Cb)()],tm.prototype,"placeholder",void 0),tf([(0,r.Cb)()],tm.prototype,"type",void 0),tf([(0,r.Cb)()],tm.prototype,"value",void 0),tf([(0,r.Cb)()],tm.prototype,"errorText",void 0),tf([(0,r.Cb)()],tm.prototype,"warningText",void 0),tf([(0,r.Cb)()],tm.prototype,"onSubmit",void 0),tf([(0,r.Cb)()],tm.prototype,"size",void 0),tf([(0,r.Cb)({attribute:!1})],tm.prototype,"onKeyDown",void 0),tm=tf([(0,w.M)("wui-input-text")],tm);let tw=(0,b.iv)`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.iconDefault};
    cursor: pointer;
    padding: ${({spacing:e})=>e[2]};
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }
`;var tb=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let ty=class extends i.oi{constructor(){super(...arguments),this.inputComponentRef=tr(),this.inputValue=""}render(){return(0,i.dy)`
      <wui-input-text
        ${tl(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue?(0,i.dy)`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`:null}
      </wui-input-text>
    `}onInputChange(e){this.inputValue=e.detail||""}clearValue(){let e=this.inputComponentRef.value,t=e?.inputElementRef.value;t&&(t.value="",this.inputValue="",t.focus(),t.dispatchEvent(new Event("input")))}};ty.styles=[m.ET,tw],tb([(0,r.Cb)()],ty.prototype,"inputValue",void 0),ty=tb([(0,w.M)("wui-search-bar")],ty);let tv=(0,i.YP)`<svg  viewBox="0 0 48 54" fill="none">
  <path
    d="M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z"
  />
</svg>`,tC=(0,b.iv)`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({tokens:e})=>e.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;var tx=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let t$=class extends i.oi{constructor(){super(...arguments),this.type="wallet"}render(){return(0,i.dy)`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return"network"===this.type?(0,i.dy)` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${tv}`:(0,i.dy)`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};t$.styles=[m.ET,m.ZM,tC],tx([(0,r.Cb)()],t$.prototype,"type",void 0),t$=tx([(0,w.M)("wui-card-select-loader")],t$);var tk=o(6349);let tR=(0,i.iv)`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;var tE=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let tI=class extends i.oi{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&tk.H.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&tk.H.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&tk.H.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&tk.H.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&tk.H.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&tk.H.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&tk.H.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&tk.H.getSpacingStyles(this.margin,3)};
    `,(0,i.dy)`<slot></slot>`}};tI.styles=[m.ET,tR],tE([(0,r.Cb)()],tI.prototype,"gridTemplateRows",void 0),tE([(0,r.Cb)()],tI.prototype,"gridTemplateColumns",void 0),tE([(0,r.Cb)()],tI.prototype,"justifyItems",void 0),tE([(0,r.Cb)()],tI.prototype,"alignItems",void 0),tE([(0,r.Cb)()],tI.prototype,"justifyContent",void 0),tE([(0,r.Cb)()],tI.prototype,"alignContent",void 0),tE([(0,r.Cb)()],tI.prototype,"columnGap",void 0),tE([(0,r.Cb)()],tI.prototype,"rowGap",void 0),tE([(0,r.Cb)()],tI.prototype,"gap",void 0),tE([(0,r.Cb)()],tI.prototype,"padding",void 0),tE([(0,r.Cb)()],tI.prototype,"margin",void 0),tI=tE([(0,w.M)("wui-grid")],tI);let tS=(0,c.iv)`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({spacing:e})=>e["2"]};
    padding: ${({spacing:e})=>e["3"]} ${({spacing:e})=>e["0"]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({borderRadius:e})=>e["4"]}, 20px);
    transition:
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({tokens:e})=>e.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({colors:e})=>e.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({colors:e})=>e.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({colors:e})=>e.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;var tT=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let tA=class extends i.oi{constructor(){super(),this.observer=new IntersectionObserver(()=>void 0),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.wallet=void 0,this.observer=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting?(this.visible=!0,this.fetchImageSrc()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){let e=this.wallet?.badge_type==="certified";return(0,i.dy)`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${(0,d.o)(e?"certified":void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${e?(0,i.dy)`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return(this.visible||this.imageSrc)&&!this.imageLoading?(0,i.dy)`
      <wui-wallet-image
        size="lg"
        imageSrc=${(0,d.o)(this.imageSrc)}
        name=${this.wallet?.name}
        .installed=${this.wallet?.installed}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `:this.shimmerTemplate()}shimmerTemplate(){return(0,i.dy)`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=A.f.getWalletImage(this.wallet),this.imageSrc||(this.imageLoading=!0,this.imageSrc=await A.f.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}};tA.styles=tS,tT([(0,r.SB)()],tA.prototype,"visible",void 0),tT([(0,r.SB)()],tA.prototype,"imageSrc",void 0),tT([(0,r.SB)()],tA.prototype,"imageLoading",void 0),tT([(0,r.Cb)()],tA.prototype,"wallet",void 0),tA=tT([(0,c.Mo)("w3m-all-wallets-list-item")],tA);let tP=(0,c.iv)`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-inout-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({spacing:e})=>e["4"]};
    padding-bottom: ${({spacing:e})=>e["4"]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;var tB=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let tO="local-paginator",tj=class extends i.oi{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!l.ApiController.state.wallets.length,this.wallets=l.ApiController.state.wallets,this.recommended=l.ApiController.state.recommended,this.featured=l.ApiController.state.featured,this.filteredWallets=l.ApiController.state.filteredWallets,this.unsubscribe.push(l.ApiController.subscribeKey("wallets",e=>this.wallets=e),l.ApiController.subscribeKey("recommended",e=>this.recommended=e),l.ApiController.subscribeKey("featured",e=>this.featured=e),l.ApiController.subscribeKey("filteredWallets",e=>this.filteredWallets=e))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.paginationObserver?.disconnect()}render(){return(0,i.dy)`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","3","3","3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;let e=this.shadowRoot?.querySelector("wui-grid");e&&(await l.ApiController.fetchWalletsByPage({page:1}),await e.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,e.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(e,t){return[...Array(e)].map(()=>(0,i.dy)`
        <wui-card-select-loader type="wallet" id=${(0,d.o)(t)}></wui-card-select-loader>
      `)}getWallets(){let e=[...this.featured,...this.recommended];this.filteredWallets?.length>0?e.push(...this.filteredWallets):e.push(...this.wallets);let t=n.j.uniqueBy(e,"id"),o=q.J.markWalletsAsInstalled(t);return q.J.markWalletsWithDisplayIndex(o)}walletsTemplate(){return this.getWallets().map(e=>(0,i.dy)`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${e.id}"
          @click=${()=>this.onConnectWallet(e)}
          .wallet=${e}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){let{wallets:e,recommended:t,featured:o,count:i}=l.ApiController.state,r=window.innerWidth<352?3:4,n=e.length+t.length,a=Math.ceil(n/r)*r-n+r;return(a-=e.length?o.length%r:0,0===i&&o.length>0)?null:0===i||[...o,...e,...t].length<i?this.shimmerTemplate(a,tO):null}createPaginationObserver(){let e=this.shadowRoot?.querySelector(`#${tO}`);e&&(this.paginationObserver=new IntersectionObserver(([e])=>{if(e?.isIntersecting&&!this.loading){let{page:e,count:t,wallets:o}=l.ApiController.state;o.length<t&&l.ApiController.fetchWalletsByPage({page:e+1})}}),this.paginationObserver.observe(e))}onConnectWallet(e){h.ConnectorController.selectWalletConnector(e)}};tj.styles=tP,tB([(0,r.SB)()],tj.prototype,"loading",void 0),tB([(0,r.SB)()],tj.prototype,"wallets",void 0),tB([(0,r.SB)()],tj.prototype,"recommended",void 0),tB([(0,r.SB)()],tj.prototype,"featured",void 0),tB([(0,r.SB)()],tj.prototype,"filteredWallets",void 0),tj=tB([(0,c.Mo)("w3m-all-wallets-list")],tj);let tL=(0,i.iv)`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;var tz=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let tM=class extends i.oi{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.query=""}render(){return this.onSearch(),this.loading?(0,i.dy)`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await l.ApiController.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){let{search:e}=l.ApiController.state,t=q.J.markWalletsAsInstalled(e);return e.length?(0,i.dy)`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","3","3","3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${t.map(e=>(0,i.dy)`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(e)}
              .wallet=${e}
              data-testid="wallet-search-item-${e.id}"
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:(0,i.dy)`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(e){h.ConnectorController.selectWalletConnector(e)}};tM.styles=tL,tz([(0,r.SB)()],tM.prototype,"loading",void 0),tz([(0,r.Cb)()],tM.prototype,"query",void 0),tz([(0,r.Cb)()],tM.prototype,"badge",void 0),tM=tz([(0,c.Mo)("w3m-all-wallets-search")],tM);var tN=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let tW=class extends i.oi{constructor(){super(...arguments),this.search="",this.badge=void 0,this.onDebouncedSearch=n.j.debounce(e=>{this.search=e})}render(){let e=this.search.length>=2;return(0,i.dy)`
      <wui-flex .padding=${["1","3","3","3"]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${"certified"===this.badge}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${e||this.badge?(0,i.dy)`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`:(0,i.dy)`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}onCertifiedSwitchChange(e){e.detail?(this.badge="certified",ei.SnackController.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return n.j.isMobile()?(0,i.dy)`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){f.RouterController.push("ConnectingWalletConnect")}};tN([(0,r.SB)()],tW.prototype,"search",void 0),tN([(0,r.SB)()],tW.prototype,"badge",void 0),tW=tN([(0,c.Mo)("w3m-all-wallets-view")],tW);let tD=(0,b.iv)`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      scale ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, scale;
  }

  wui-text {
    text-transform: capitalize;
  }

  wui-image {
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var tU=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a};let t_=class extends i.oi{constructor(){super(...arguments),this.imageSrc="google",this.loading=!1,this.disabled=!1,this.rightIcon=!0,this.rounded=!1,this.fullSize=!1}render(){return this.dataset.rounded=this.rounded?"true":"false",(0,i.dy)`
      <button
        ?disabled=${!!this.loading||!!this.disabled}
        data-loading=${this.loading}
        tabindex=${(0,d.o)(this.tabIdx)}
      >
        <wui-flex gap="2" alignItems="center">
          ${this.templateLeftIcon()}
          <wui-flex gap="1">
            <slot></slot>
          </wui-flex>
        </wui-flex>
        ${this.templateRightIcon()}
      </button>
    `}templateLeftIcon(){return this.icon?(0,i.dy)`<wui-image
        icon=${this.icon}
        iconColor=${(0,d.o)(this.iconColor)}
        ?boxed=${!0}
        ?rounded=${this.rounded}
      ></wui-image>`:(0,i.dy)`<wui-image
      ?boxed=${!0}
      ?rounded=${this.rounded}
      ?fullSize=${this.fullSize}
      src=${this.imageSrc}
    ></wui-image>`}templateRightIcon(){return this.rightIcon?this.loading?(0,i.dy)`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:(0,i.dy)`<wui-icon name="chevronRight" size="lg" color="default"></wui-icon>`:null}};t_.styles=[m.ET,m.ZM,tD],tU([(0,r.Cb)()],t_.prototype,"imageSrc",void 0),tU([(0,r.Cb)()],t_.prototype,"icon",void 0),tU([(0,r.Cb)()],t_.prototype,"iconColor",void 0),tU([(0,r.Cb)({type:Boolean})],t_.prototype,"loading",void 0),tU([(0,r.Cb)()],t_.prototype,"tabIdx",void 0),tU([(0,r.Cb)({type:Boolean})],t_.prototype,"disabled",void 0),tU([(0,r.Cb)({type:Boolean})],t_.prototype,"rightIcon",void 0),tU([(0,r.Cb)({type:Boolean})],t_.prototype,"rounded",void 0),tU([(0,r.Cb)({type:Boolean})],t_.prototype,"fullSize",void 0),t_=tU([(0,w.M)("wui-list-item")],t_);let tH=class extends i.oi{constructor(){super(...arguments),this.wallet=f.RouterController.state.data?.wallet}render(){if(!this.wallet)throw Error("w3m-downloads-view");return(0,i.dy)`
      <wui-flex gap="2" flexDirection="column" .padding=${["3","3","4","3"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?(0,i.dy)`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?(0,i.dy)`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?(0,i.dy)`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?(0,i.dy)`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `:null}onChromeStore(){this.wallet?.chrome_store&&n.j.openHref(this.wallet.chrome_store,"_blank")}onAppStore(){this.wallet?.app_store&&n.j.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&n.j.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&n.j.openHref(this.wallet.homepage,"_blank")}};tH=function(e,t,o,i){var r,n=arguments.length,a=n<3?t:null===i?i=Object.getOwnPropertyDescriptor(t,o):i;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,i);else for(var l=e.length-1;l>=0;l--)(r=e[l])&&(a=(n<3?r(a):n>3?r(t,o,a):r(t,o))||a);return n>3&&a&&Object.defineProperty(t,o,a),a}([(0,c.Mo)("w3m-downloads-view")],tH)}};