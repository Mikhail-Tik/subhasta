/* ---- v35: the map beneath the globe — a WebGL pass draws a picture of the whole Earth onto the orthographic globe, and the plate
   canvas takes it as an image before the borders, the rivers and the labels are drawn over it. Four styles: the engraving (no picture:
   the hatching of v29–v34, the market's minimal plate), relief (Natural Earth II: land cover and shaded relief with water, public domain,
   naturalearthdata.com via github.com/nvkelso/natural-earth-raster), ink (Natural Earth's grey shaded relief with the ocean floor, tinted
   to the theme) and satellite (NASA's Blue Marble, public domain, via github.com/vasturiano/three-globe). Pictures: img/relief/<style>-<4k|8k>.jpg
   on the website, assets in the artifacts (RELIEF_ASSETS, filled by build.py). The picture is equirectangular; the fragment shader inverts the
   globe's rotation (lon0, lat0) for each pixel, so the map turns and zooms with the engraving exactly. WebGL 2 where there is one (gradients
   picked across the date line so no seam shows), WebGL 1 otherwise; without WebGL the engraving stays. Names here are prefixed rl/RL. */
const RELIEF_ASSETS={};
const RL_STYLES=[['engraving','Engraving'],['relief','Relief'],['ink','Ink'],['satellite','Satellite']];
const RL_CREDIT={relief:'Natural Earth II (public domain)',ink:'Natural Earth grey relief (public domain)',satellite:'NASA Blue Marble (public domain)'};
const RL={gl:null,cv:null,prog:null,ver:0,tex:{},busy:{},failed:{},max:0,dead:false,loc:{}};
function rlUrl(style){const A=RELIEF_ASSETS[style];const big=RL.max>=8192;if(A)return (big&&A['8k'])||A['4k']||A['8k']||null;if(typeof inArtifact==='function'&&inArtifact())return null;if(!/^https?:$/.test(location.protocol))return null;const has8=style!=='satellite';return `img/relief/${style}-${big&&has8?'8k':'4k'}.jpg`;}
function rlInit(){if(RL.gl)return RL.gl;if(RL.dead||typeof document==='undefined')return null;
  try{const cv=document.createElement('canvas');let gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});let ver=2;
    if(!gl){gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true});ver=1;}
    if(!gl){RL.dead=true;return null;}
    const head=ver===2?'#version 300 es\nprecision highp float;\n':'precision highp float;\n';
    const vs=ver===2?head+'in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}':head+'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const body=`uniform sampler2D tex;uniform sampler2D det;uniform vec4 db;uniform float don;uniform vec2 res;uniform vec3 geo;uniform vec4 rot;uniform float sty;uniform float lit;uniform vec3 ink;uniform vec3 paper;
      ${ver===2?'out vec4 oc;':''}
      void main(){vec2 q=gl_FragCoord.xy;float sx=q.x,sy=res.y-q.y;float y1=(sx-geo.x)/geo.z,up=(geo.y-sy)/geo.z;float r2=y1*y1+up*up;
        if(r2>1.0){${ver===2?'oc':'gl_FragColor'}=vec4(0.);return;}
        float d=sqrt(1.0-r2);float x1=d*rot.z-up*rot.w;float v2=d*rot.w+up*rot.z;float v0=x1*rot.x-y1*rot.y;float v1=x1*rot.y+y1*rot.x;
        float lon=atan(v1,v0);float lat=asin(clamp(v2,-1.,1.));vec2 uv=vec2(lon*0.15915494+0.5,0.5-lat*0.31830989);
        ${ver===2?`vec2 ub=vec2(fract(uv.x+0.5)-0.5,uv.y);vec2 gx=dFdx(uv),gy=dFdy(uv),hx=dFdx(ub),hy=dFdy(ub);if(abs(hx.x)+abs(hy.x)<abs(gx.x)+abs(gy.x)){gx=hx;gy=hy;}vec3 c=textureGrad(tex,uv,gx,gy).rgb;if(don>0.5){vec2 du=(uv-db.xy)/(db.zw-db.xy);if(du.x>0.0&&du.x<1.0&&du.y>0.0&&du.y<1.0){vec2 ed=min(du,1.0-du);float fe=smoothstep(0.0,0.03,min(ed.x,ed.y));c=mix(c,texture(det,du).rgb,fe);}}`:'vec3 c=texture2D(tex,uv).rgb;'}
        float l=dot(c,vec3(.299,.587,.114));
        if(sty<0.5){c=mix(c,vec3(l),lit>0.5?0.12:0.30);c=lit>0.5?mix(c,paper,0.10):c*0.80+ink*0.06;}
        else if(sty<1.5){float t=clamp(l,0.,1.);c=lit>0.5?mix(ink,paper,0.28+0.72*t):mix(ink,paper,pow(t,1.22)*0.90);}
        else{c=lit>0.5?mix(c,paper,0.06):c*0.86;}
        float limb=mix(lit>0.5?0.80:0.62,1.0,pow(d,0.55));float e=smoothstep(1.0,0.995,r2);c*=limb;
        ${ver===2?'oc':'gl_FragColor'}=vec4(c*e,e);}`;
    const fs=head+(ver===2?body:body);
    const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){throw new Error(gl.getShaderInfoLog(o)||'shader');}return o;};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(pr,0,'p');gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr)||'link');
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    gl.useProgram(pr);for(const u of ['tex','det','db','don','res','geo','rot','sty','lit','ink','paper'])RL.loc[u]=gl.getUniformLocation(pr,u);
    RL.gl=gl;RL.cv=cv;RL.prog=pr;RL.ver=ver;RL.max=gl.getParameter(gl.MAX_TEXTURE_SIZE)||4096;return gl;
  }catch(e){RL.dead=true;try{console.warn('relief: no WebGL map',e&&e.message);}catch(_){}return null;}}
/* the picture of a style, loaded once; onReady redraws the plate when it arrives */
function rlTexture(style,onReady){const gl=rlInit();if(!gl)return null;if(RL.tex[style])return RL.tex[style];if(RL.busy[style]||RL.failed[style])return null;const u=rlUrl(style);if(!u){RL.failed[style]=1;return null;}
  RL.busy[style]=1;const im=new Image();im.decoding='async';
  im.onload=()=>{try{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,im);gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      const an=gl.getExtension('EXT_texture_filter_anisotropic')||gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');if(an)gl.texParameterf(gl.TEXTURE_2D,an.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)||1));
      RL.tex[style]=t;}catch(e){RL.failed[style]=1;}delete RL.busy[style];if(typeof onReady==='function')onReady();};
  im.onerror=()=>{delete RL.busy[style];RL.failed[style]=1;if(typeof onReady==='function')onReady();};im.src=u;return null;}
/* v35: the close view on the website — the 10m relief (Natural Earth II at 21,600 × 10,800, public domain) cut into 16 × 8 tiles of
   22.5° (img/relief/hd/<col>_<row>.jpg, 1024 px each); when the globe is close (zoom ≥ 2.2) the tiles under the view (at most 3 × 3) are
   drawn into one patch, which the shader reads inside its bounds and the 8k picture outside them. WebGL 2 only; not in the artifact. */
const RL_HD={tile:1024,cols:16,rows:8,deg:22.5};
function rlHdAvail(style){return style==='relief'&&RL.ver===2&&!(typeof inArtifact==='function'&&inArtifact())&&/^https?:$/.test(location.protocol)&&!RL.failed.hd;}
function rlHdPatch(v,onReady){const gl=RL.gl;if(!gl||(v.zoom||1)<2.2)return null;
  const W=v.w,H=v.h,cl=Math.cos(v.lon0*Math.PI/180),sl=Math.sin(v.lon0*Math.PI/180),cp=Math.cos(v.lat0*Math.PI/180),sp=Math.sin(v.lat0*Math.PI/180);
  let lo0=1e9,lo1=-1e9,la0=1e9,la1=-1e9,n=0;const lons=[];
  for(let i=0;i<=8;i++)for(let j=0;j<=8;j++){const sx=W*i/8,sy=H*j/8;const y1=(sx-v.cx)/v.R,up=(v.cy-sy)/v.R,r2=y1*y1+up*up;if(r2>1)continue;const d=Math.sqrt(1-r2);const x1=d*cp-up*sp,v2=d*sp+up*cp,v0=x1*cl-y1*sl,v1=x1*sl+y1*cl;
    const lon=Math.atan2(v1,v0)*180/Math.PI,lat=Math.asin(Math.max(-1,Math.min(1,v2)))*180/Math.PI;lons.push(lon);la0=Math.min(la0,lat);la1=Math.max(la1,lat);n++;}
  if(n<4)return null;const ref=v.lon0;for(const l of lons){const u=((l-ref+540)%360)-180+ref;lo0=Math.min(lo0,u);lo1=Math.max(lo1,u);}
  if(lo1-lo0>67.5||la1-la0>67.5)return null;
  const c0=Math.floor((lo0+180)/RL_HD.deg),c1=Math.floor((lo1+180)/RL_HD.deg),r0=Math.max(0,Math.floor((90-la1)/RL_HD.deg)),r1=Math.min(RL_HD.rows-1,Math.floor((90-la0)/RL_HD.deg));
  if(c0<0||c1>=RL_HD.cols||c1-c0>2||r1-r0>2)return null;   /* the date line, or too wide a view */
  const key=`${c0},${r0},${c1},${r1}`;const P=RL.hdp||(RL.hdp={key:null,tex:null,cv:null,tiles:new Map(),ready:false});
  const need=[];for(let c=c0;c<=c1;c++)for(let r=r0;r<=r1;r++)need.push([c,r]);
  let all=true;for(const [c,r] of need){const k=c+'_'+r;let t=P.tiles.get(k);if(!t){t={im:new Image(),ok:false,bad:false};t.im.decoding='async';t.im.onload=()=>{t.ok=true;if(typeof onReady==='function')onReady();};t.im.onerror=()=>{t.bad=true;RL.failed.hd=1;};t.im.src=`img/relief/hd/${k}.jpg`;P.tiles.set(k,t);}if(!t.ok)all=false;}
  if(P.key!==key){if(!all)return P.ready&&P.key===key?P:null;const T=RL_HD.tile,cw=(c1-c0+1)*T,ch=(r1-r0+1)*T;const cv=P.cv||(P.cv=document.createElement('canvas'));cv.width=cw;cv.height=ch;const cx=cv.getContext('2d');
    for(const [c,r] of need)cx.drawImage(P.tiles.get(c+'_'+r).im,(c-c0)*T,(r-r0)*T,T,T);
    if(!P.tex)P.tex=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,P.tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,cv);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.activeTexture(gl.TEXTURE0);
    P.key=key;P.ready=true;P.db=[c0/RL_HD.cols,r0/RL_HD.rows,(c1+1)/RL_HD.cols,(r1+1)/RL_HD.rows];}
  return P;}
/* draw the style for the view: v = {w,h,dpr,cx,cy,R,lon0,lat0,light,ink:[r,g,b],paper:[r,g,b]}; returns the canvas, or null while the picture loads */
function rlRender(style,v,onReady){if(style==='engraving')return null;const gl=rlInit();if(!gl)return null;const t=rlTexture(style,onReady);if(!t)return null;
  const W=Math.max(1,Math.round(v.w*v.dpr)),H=Math.max(1,Math.round(v.h*v.dpr));if(RL.cv.width!==W||RL.cv.height!==H){RL.cv.width=W;RL.cv.height=H;}
  gl.viewport(0,0,W,H);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(RL.prog);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,t);
  const L=RL.loc,lam=v.lon0*Math.PI/180,phi=v.lat0*Math.PI/180;gl.uniform1i(L.tex,0);gl.uniform2f(L.res,W,H);gl.uniform3f(L.geo,v.cx*v.dpr,v.cy*v.dpr,v.R*v.dpr);
  gl.uniform4f(L.rot,Math.cos(lam),Math.sin(lam),Math.cos(phi),Math.sin(phi));gl.uniform1f(L.sty,style==='relief'?0:style==='ink'?1:2);gl.uniform1f(L.lit,v.light?1:0);
  const n=c=>(c||[0,0,0]).map(x=>x/255);gl.uniform3fv(L.ink,n(v.ink));gl.uniform3fv(L.paper,n(v.paper));
  const P=rlHdAvail(style)?rlHdPatch(v,onReady):null;if(P&&P.ready&&P.tex){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,P.tex);gl.uniform1i(L.det,1);gl.uniform4f(L.db,P.db[0],P.db[1],P.db[2],P.db[3]);gl.uniform1f(L.don,1);gl.activeTexture(gl.TEXTURE0);}else{gl.uniform1i(L.det,1);gl.uniform1f(L.don,0);}
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);RL.hdOn=!!(P&&P.ready);return RL.cv;}
/* the style each mode of the world shows, remembered in this browser: the historical globe opens in relief, the market's modes engraved */
function rlStyleFor(mode){let s=null;try{s=localStorage.getItem('subhasta.map.'+(mode==='then'?'then':'now'));}catch(e){}if(!RL_STYLES.some(([k])=>k===s))s=mode==='then'?'relief':'engraving';if(s!=='engraving'&&(RL.dead||RL.failed[s]))return 'engraving';return s;}
function rlSetStyle(mode,s){try{localStorage.setItem('subhasta.map.'+(mode==='then'?'then':'now'),s);}catch(e){}}
window.__RL={styles:()=>RL_STYLES.map(x=>x[0]),styleFor:m=>rlStyleFor(m),dead:()=>!!RL.dead};
