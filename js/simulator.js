const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const unionBounds=(a,b)=>({minX:Math.min(a.minX,b.minX),maxX:Math.max(a.maxX,b.maxX),minY:Math.min(a.minY,b.minY),maxY:Math.max(a.maxY,b.maxY),minZ:Math.min(a.minZ,b.minZ),maxZ:Math.max(a.maxZ,b.maxZ)});

export class StockSimulator{
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d');
    this.view='free';
    this.viewMode='3d';
    this.renderQuality='medium';
    this.showRapids=true;
    this.showGrid=true;
    this.showTable=true;
    this.showToolpath=true;
    this.showStock=true;
    this.focusTarget='scene';
    this.currentTool={diameter:10,length:70,type:'flat',name:'Fresa plana Ø10 mm',angle:90};
    this.camera={yaw:-45*Math.PI/180,pitch:35*Math.PI/180,zoom:1,panX:0,panY:0};
    this.drag=null;
    this.cutMarks=[];
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(canvas);
    this.bindCameraControls();
    this.configure({units:'mm',x:220,y:120,z:30,resolution:3,renderQuality:'medium',zeroMode:'center',position:{x:0,y:0},table:{x:600,y:400,z:40,topZ:-30,slotDirection:'x'}});
    this.setPath([]);
  }

  qualitySettings(level=this.renderQuality){
    return {
      low:{tileBudget:1800,circleSegments:12,pathStep:.9,markLimit:220},
      medium:{tileBudget:3200,circleSegments:18,pathStep:.65,markLimit:360},
      high:{tileBudget:5200,circleSegments:26,pathStep:.42,markLimit:520},
      ultra:{tileBudget:8600,circleSegments:36,pathStep:.28,markLimit:700}
    }[level]||{tileBudget:3200,circleSegments:18,pathStep:.65,markLimit:360};
  }

  bindCameraControls(){
    this.canvas.addEventListener('contextmenu',e=>e.preventDefault());
    this.canvas.addEventListener('pointerdown',e=>{
      this.canvas.setPointerCapture(e.pointerId);
      this.drag={x:e.clientX,y:e.clientY,mode:this.viewMode==='2d'?'pan':((e.button===2||e.shiftKey||e.ctrlKey)?'pan':'rotate')};
      this.canvas.classList.add('dragging');
    });
    this.canvas.addEventListener('pointermove',e=>{
      if(!this.drag)return;
      const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
      this.drag.x=e.clientX;this.drag.y=e.clientY;
      if(this.drag.mode==='rotate'){
        this.camera.yaw+=dx*.008;
        this.camera.pitch=clamp(this.camera.pitch+dy*.008,0.02,Math.PI/2-.01);
        this.view='free';
      }else{
        this.camera.panX+=dx;
        this.camera.panY+=dy;
      }
      this.draw();
    });
    const release=()=>{this.drag=null;this.canvas.classList.remove('dragging');};
    this.canvas.addEventListener('pointerup',release);
    this.canvas.addEventListener('pointercancel',release);
    this.canvas.addEventListener('wheel',e=>{
      e.preventDefault();
      if(this.viewMode==='2d') this.camera.zoom=clamp(this.camera.zoom*Math.exp(-e.deltaY*.0012),.35,10);
      else this.camera.zoom=clamp(this.camera.zoom*Math.exp(-e.deltaY*.0012),.15,12);
      this.draw();
    },{passive:false});
    this.canvas.addEventListener('dblclick',()=>this.fitView(this.viewMode==='2d'?'stock':'scene'));
  }

  configure(cfg){
    this.cfg={...cfg,renderQuality:cfg.renderQuality||this.renderQuality,position:{x:cfg.position?.x||0,y:cfg.position?.y||0},table:{x:cfg.table?.x||600,y:cfg.table?.y||400,z:cfg.table?.z||40,topZ:Number.isFinite(cfg.table?.topZ)?cfg.table.topZ:-(cfg.z||30),slotDirection:cfg.table?.slotDirection==='y'?'y':'x'}};
    this.renderQuality=this.cfg.renderQuality||'medium';
    this.nx=Math.ceil(this.cfg.x/this.cfg.resolution)+1;
    this.ny=Math.ceil(this.cfg.y/this.cfg.resolution)+1;
    this.depth=new Float32Array(this.nx*this.ny);
    this.depth.fill(0);
    this.cutMarks=[];
    this.path=[];
    this.current=-1;
    this.toolPos={x:0,y:0,z:Math.max(100,this.stockBounds().maxZ+50)};
    this.fitView(this.viewMode==='2d'?'stock':'scene',false);
  }

  resetCut(){this.depth.fill(0);this.cutMarks=[];this.current=-1;this.toolPos={x:0,y:0,z:Math.max(100,this.stockBounds().maxZ+50)};this.draw();}
  setPath(path){this.path=path||[];this.current=-1;this.draw();}
  setCurrentTool(tool={}){this.currentTool={...this.currentTool,...tool};this.draw();}
  getCamera(){return {...this.camera,view:this.view,focusTarget:this.focusTarget};}
  setCamera(camera={}){Object.assign(this.camera,camera);if(camera.view)this.view=camera.view;if(camera.focusTarget)this.focusTarget=camera.focusTarget;this.draw();}
  setDisplayMode(mode='3d'){this.viewMode=mode==='2d'?'2d':'3d';if(this.viewMode==='2d'){this.view='top';this.camera.pitch=89.5*Math.PI/180;this.camera.yaw=-90*Math.PI/180;}this.draw();}
  setRenderQuality(level='medium'){this.renderQuality=['low','medium','high','ultra'].includes(level)?level:'medium';this.cfg.renderQuality=this.renderQuality;this.resize();}

  stockBounds(){
    const {x,y,z,zeroMode,position,table}=this.cfg,top=table.topZ+z;
    return zeroMode==='center'
      ?{minX:position.x-x/2,maxX:position.x+x/2,minY:position.y-y/2,maxY:position.y+y/2,minZ:table.topZ,maxZ:top}
      :{minX:position.x,maxX:position.x+x,minY:position.y,maxY:position.y+y,minZ:table.topZ,maxZ:top};
  }

  tableBounds(){const t=this.cfg.table;return{minX:-t.x/2,maxX:t.x/2,minY:-t.y/2,maxY:t.y/2,minZ:t.topZ-t.z,maxZ:t.topZ};}

  sceneBounds(target=this.focusTarget){
    if(target==='stock'){
      const b=this.stockBounds(),m=Math.max(this.cfg.x,this.cfg.y)*.12;
      return{minX:b.minX-m,maxX:b.maxX+m,minY:b.minY-m,maxY:b.maxY+m,minZ:b.minZ-Math.max(5,this.cfg.z*.2),maxZ:b.maxZ+Math.max(40,this.currentTool.length*.65)};
    }
    let b=unionBounds(this.tableBounds(),this.stockBounds());
    if(this.path?.length){
      let pb={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};
      for(const step of this.path){if(step.kind!=='move')continue;for(const p of [step.from,step.to]){pb.minX=Math.min(pb.minX,p.x);pb.maxX=Math.max(pb.maxX,p.x);pb.minY=Math.min(pb.minY,p.y);pb.maxY=Math.max(pb.maxY,p.y);pb.minZ=Math.min(pb.minZ,p.z);pb.maxZ=Math.max(pb.maxZ,p.z);}}
      if(Number.isFinite(pb.minX))b=unionBounds(b,pb);
    }
    const margin=Math.max(20,Math.min(this.cfg.table.x,this.cfg.table.y)*.05);
    return{minX:b.minX-margin,maxX:b.maxX+margin,minY:b.minY-margin,maxY:b.maxY+margin,minZ:b.minZ-margin*.3,maxZ:b.maxZ+margin};
  }

  setView(name){
    this.view=name;
    if(name==='iso'){this.camera.yaw=-45*Math.PI/180;this.camera.pitch=35*Math.PI/180;}
    else if(name==='top'){this.camera.yaw=-90*Math.PI/180;this.camera.pitch=89.5*Math.PI/180;}
    else if(name==='front'){this.camera.yaw=-90*Math.PI/180;this.camera.pitch=.02;}
    else if(name==='right'){this.camera.yaw=.001;this.camera.pitch=.02;}
    this.camera.panX=0;this.camera.panY=0;this.camera.zoom=1;
    this.draw();
  }

  fitView(target='scene',redraw=true){
    if(typeof target==='boolean'){redraw=target;target='scene';}
    this.focusTarget=target==='stock'?'stock':'scene';
    this.camera.zoom=1;this.camera.panX=0;this.camera.panY=0;
    if(redraw)this.draw();
  }

  applyStep(step){
    if(!step||step.kind!=='move')return;
    this.current++;
    this.toolPos={...step.to};
    this.currentTool={...this.currentTool,diameter:step.diameter||this.currentTool.diameter,length:step.toolLength||this.currentTool.length,type:step.toolType||this.currentTool.type,name:step.toolName||this.currentTool.name,angle:step.toolAngle||this.currentTool.angle};
    if(step.cut)this.cutSegment(step.from,step.to,this.currentTool);
    const drillingCycle=/^G(?:73|74|76|8[1-9])$/.test(step.cycle||''),verticalDown=Math.hypot(step.to.x-step.from.x,step.to.y-step.from.y)<=Math.max(.02,(this.currentTool.diameter||10)*.04)&&step.to.z<step.from.z;
    if(drillingCycle&&verticalDown)this.registerCutMark(step.to.x,step.to.y,Math.max(.1,(this.currentTool.diameter||10)/2),step.to.z,this.currentTool);
    this.draw();
  }

  cutterSurfaceZ(z,distance,tool,radius){
    const type=tool.type||'flat';
    if(type==='ball')return z+radius-Math.sqrt(Math.max(0,radius*radius-distance*distance));
    if(type==='drill'||type==='chamfer'){
      const half=clamp((tool.angle||90)/2,5,89)*Math.PI/180;
      return z+distance/Math.tan(half);
    }
    return z;
  }

  registerCutMark(x,y,radius,bottomZ,tool){
    const bounds=this.stockBounds(),depth=clamp(bounds.maxZ-bottomZ,0,this.cfg.z);
    if(depth<=0.01)return;
    const profile=this.qualitySettings();
    const existing=this.cutMarks.find(mark=>Math.hypot(mark.x-x,mark.y-y)<=Math.max(mark.radius,radius)*0.28);
    if(existing){existing.radius=Math.max(existing.radius,radius);existing.bottomZ=Math.min(existing.bottomZ,bottomZ);existing.depth=Math.max(existing.depth,depth);existing.toolType=tool.type||existing.toolType;existing.toolAngle=tool.angle||existing.toolAngle;return;}
    this.cutMarks.push({x,y,radius,bottomZ,depth,toolType:tool.type||'flat',toolAngle:tool.angle||90});
    if(this.cutMarks.length>profile.markLimit)this.cutMarks.shift();
  }

  cutSegment(a,b,tool){
    const bounds=this.stockBounds(),profile=this.qualitySettings(),len=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z),count=Math.max(1,Math.ceil(len/(this.cfg.resolution*profile.pathStep))),r=Math.max(.1,(tool.diameter||10)/2);
    for(let s=0;s<=count;s++){
      const t=s/count,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t;
      if(z>bounds.maxZ+r)continue;
      const minI=Math.max(0,Math.floor((x-r-bounds.minX)/this.cfg.resolution));
      const maxI=Math.min(this.nx-1,Math.ceil((x+r-bounds.minX)/this.cfg.resolution));
      const minJ=Math.max(0,Math.floor((y-r-bounds.minY)/this.cfg.resolution));
      const maxJ=Math.min(this.ny-1,Math.ceil((y+r-bounds.minY)/this.cfg.resolution));
      for(let j=minJ;j<=maxJ;j++)for(let i=minI;i<=maxI;i++){
        const px=bounds.minX+i*this.cfg.resolution,py=bounds.minY+j*this.cfg.resolution,distance=Math.hypot(px-x,py-y);
        if(distance<=r){
          const surface=this.cutterSurfaceZ(z,distance,tool,r),d=Math.min(this.cfg.z,Math.max(0,bounds.maxZ-surface)),idx=j*this.nx+i;
          if(d>this.depth[idx])this.depth[idx]=d;
        }
      }
    }
  }

  resize(){
    const r=this.canvas.getBoundingClientRect(),limit={low:1,medium:1.5,high:2,ultra:2.5}[this.renderQuality]||1.5,dpr=Math.min(limit,window.devicePixelRatio||1);
    this.canvas.width=Math.max(1,Math.round(r.width*dpr));
    this.canvas.height=Math.max(1,Math.round(r.height*dpr));
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.w=r.width;this.h=r.height;
    this.draw();
  }

  basis(){
    const {yaw,pitch}=this.camera,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    return{dir:{x:cp*cy,y:cp*sy,z:sp},right:{x:-sy,y:cy,z:0},up:{x:-sp*cy,y:-sp*sy,z:cp}};
  }

  worldCenter(){if(this.renderCenter)return this.renderCenter;const b=this.sceneBounds();return{x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:(b.minZ+b.maxZ)/2};}

  rawProjection(point){
    const center=this.renderCenter||this.worldCenter(),d={x:point.x-center.x,y:point.y-center.y,z:point.z-center.z},b=this.basis();
    return{x:d.x*b.right.x+d.y*b.right.y+d.z*b.right.z,y:d.x*b.up.x+d.y*b.up.y+d.z*b.up.z,depth:d.x*b.dir.x+d.y*b.dir.y+d.z*b.dir.z};
  }

  computeScale(){
    const b=this.sceneBounds(),corners=[];this.renderBounds=b;this.renderCenter={x:(b.minX+b.maxX)/2,y:(b.minY+b.maxY)/2,z:(b.minZ+b.maxZ)/2};
    for(const x of [b.minX,b.maxX])for(const y of [b.minY,b.maxY])for(const z of [b.minZ,b.maxZ])corners.push(this.rawProjection({x,y,z}));
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of corners){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);}
    const width=Math.max(1,maxX-minX),height=Math.max(1,maxY-minY);
    return Math.max(.05,Math.min((this.w-90)/width,(this.h-90)/height))*this.camera.zoom;
  }

  projection(x,y,z=0){
    const p=this.rawProjection({x,y,z}),scale=this.renderScale||this.computeScale();
    return{x:this.w/2+p.x*scale+this.camera.panX,y:this.h/2-p.y*scale+this.camera.panY,depth:p.depth};
  }

  twoDBounds(target=this.focusTarget){
    const stock=this.stockBounds();
    let b={minX:stock.minX,maxX:stock.maxX,minY:stock.minY,maxY:stock.maxY};
    if(target!=='stock'&&this.path?.length){
      for(const step of this.path){
        if(step.kind!=='move')continue;
        for(const p of [step.from,step.to]){
          b.minX=Math.min(b.minX,p.x);b.maxX=Math.max(b.maxX,p.x);
          b.minY=Math.min(b.minY,p.y);b.maxY=Math.max(b.maxY,p.y);
        }
      }
    }
    const pad=Math.max(8,Math.max(b.maxX-b.minX,b.maxY-b.minY)*.08);
    return {minX:b.minX-pad,maxX:b.maxX+pad,minY:b.minY-pad,maxY:b.maxY+pad};
  }

  project2D(x,y){
    const b=this.twoDRenderBounds,scale=this.twoDScale||1;
    return {
      x:(x-b.minX)*scale+this.twoDOffsetX+this.camera.panX,
      y:this.h-((y-b.minY)*scale+this.twoDOffsetY)+this.camera.panY
    };
  }

  prepare2D(target=this.focusTarget){
    const b=this.twoDBounds(target),w=Math.max(1,b.maxX-b.minX),h=Math.max(1,b.maxY-b.minY),pad=36;
    const scale=Math.max(.1,Math.min((this.w-pad*2)/w,(this.h-pad*2)/h))*this.camera.zoom;
    this.twoDBoundsTarget=target;this.twoDRenderBounds=b;this.twoDScale=scale;
    this.twoDOffsetX=(this.w-w*scale)/2;
    this.twoDOffsetY=(this.h-h*scale)/2;
  }

  draw(){
    if(!this.ctx||!this.w||!this.h)return;
    if(this.viewMode==='2d'){this.prepare2D(this.focusTarget==='scene'?'scene':this.focusTarget);this.draw2D();return;}
    this.renderScale=this.computeScale();
    const c=this.ctx;c.clearRect(0,0,this.w,this.h);
    this.drawBackground();
    if(this.showTable)this.drawTable();
    if(this.showGrid)this.drawWorldGrid();
    if(this.showStock)this.drawStock();
    if(this.showToolpath)this.drawPath();
    this.drawTool();
    this.drawAxes();
  }

  drawBackground(){
    const c=this.ctx,g=c.createRadialGradient(this.w*.55,this.h*.35,20,this.w*.55,this.h*.45,Math.max(this.w,this.h));
    g.addColorStop(0,'#142634');g.addColorStop(.48,'#091722');g.addColorStop(1,'#050b11');
    c.fillStyle=g;c.fillRect(0,0,this.w,this.h);
    c.strokeStyle='rgba(150,185,203,.035)';c.lineWidth=1;
    for(let x=0;x<this.w;x+=32){c.beginPath();c.moveTo(x,0);c.lineTo(x,this.h);c.stroke();}
    for(let y=0;y<this.h;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(this.w,y);c.stroke();}
  }

  draw2D(){
    const c=this.ctx,b2=this.twoDRenderBounds,stock=this.stockBounds();
    c.clearRect(0,0,this.w,this.h);
    c.fillStyle='#ffffff';c.fillRect(0,0,this.w,this.h);

    if(this.showGrid){
      const step=Math.max(5,Math.round(Math.max(stock.maxX-stock.minX,stock.maxY-stock.minY)/10/5)*5);
      c.lineWidth=1;c.strokeStyle='#edf2f5';
      for(let x=Math.ceil(b2.minX/step)*step;x<=b2.maxX;x+=step){const a=this.project2D(x,b2.minY),d=this.project2D(x,b2.maxY);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(d.x,d.y);c.stroke();}
      for(let y=Math.ceil(b2.minY/step)*step;y<=b2.maxY;y+=step){const a=this.project2D(b2.minX,y),d=this.project2D(b2.maxX,y);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(d.x,d.y);c.stroke();}
    }

    const xAxisA=this.project2D(0,b2.minY),xAxisB=this.project2D(0,b2.maxY),yAxisA=this.project2D(b2.minX,0),yAxisB=this.project2D(b2.maxX,0);
    c.strokeStyle='rgba(73,194,214,.34)';c.lineWidth=1;
    c.beginPath();c.moveTo(xAxisA.x,xAxisA.y);c.lineTo(xAxisB.x,xAxisB.y);c.moveTo(yAxisA.x,yAxisA.y);c.lineTo(yAxisB.x,yAxisB.y);c.stroke();

    if(this.showStock){
      const a=this.project2D(stock.minX,stock.maxY),d=this.project2D(stock.maxX,stock.minY);
      c.strokeStyle='#3f93c8';c.lineWidth=1.6;c.setLineDash([]);c.strokeRect(a.x,a.y,d.x-a.x,d.y-a.y);
    }

    const drillSites=new Map();
    if(this.showToolpath&&this.path?.length){
      c.lineCap='round';c.lineJoin='round';
      for(let i=0;i<this.path.length;i++){
        const s=this.path[i];if(s.kind!=='move')continue;
        const radius=Math.max(.1,(s.diameter||this.currentTool.diameter||10)/2),xy=Math.hypot(s.to.x-s.from.x,s.to.y-s.from.y);
        if(/^G(?:73|74|76|8[1-9])$/.test(s.cycle||'')&&s.cut&&xy<=Math.max(.03,radius*.12)&&s.to.z<s.from.z){
          const key=`${s.to.x.toFixed(3)}:${s.to.y.toFixed(3)}:${radius.toFixed(3)}`;
          drillSites.set(key,{x:s.to.x,y:s.to.y,radius});
        }
        if(s.type==='G00'&&!this.showRapids)continue;
        const a=this.project2D(s.from.x,s.from.y),b=this.project2D(s.to.x,s.to.y);
        if(Math.hypot(b.x-a.x,b.y-a.y)<.35)continue;
        if(s.type==='G00'){
          c.strokeStyle='#aab2b7';c.lineWidth=1;c.setLineDash([5,5]);
        }else{
          c.strokeStyle='#151515';c.lineWidth=i===this.current?2.2:1.65;c.setLineDash([]);
        }
        c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
      }
      c.setLineDash([]);c.lineCap='butt';c.lineJoin='miter';
    }

    for(const site of drillSites.values()){
      const p=this.project2D(site.x,site.y),r=Math.max(3,site.radius*this.twoDScale);
      c.strokeStyle='#151515';c.lineWidth=1.65;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);c.stroke();
      c.strokeStyle='#9ca4a9';c.lineWidth=1;c.beginPath();c.moveTo(p.x-7,p.y);c.lineTo(p.x+7,p.y);c.moveTo(p.x,p.y-7);c.lineTo(p.x,p.y+7);c.stroke();
    }

    const origin=this.project2D(stock.minX,stock.minY);
    c.strokeStyle='#9ca4a9';c.lineWidth=1;c.beginPath();c.arc(origin.x,origin.y,8,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(origin.x-10,origin.y);c.lineTo(origin.x+10,origin.y);c.moveTo(origin.x,origin.y-10);c.lineTo(origin.x,origin.y+10);c.stroke();

    const toolPoint=this.project2D(this.toolPos.x,this.toolPos.y);
    c.strokeStyle='#b0b6ba';c.lineWidth=1;c.beginPath();c.moveTo(toolPoint.x-6,toolPoint.y);c.lineTo(toolPoint.x+6,toolPoint.y);c.moveTo(toolPoint.x,toolPoint.y-6);c.lineTo(toolPoint.x,toolPoint.y+6);c.stroke();
  }

  drawWorldGrid(){
    const c=this.ctx,b=this.tableBounds(),step=Math.max(10,Math.round(Math.max(this.cfg.table.x,this.cfg.table.y)/12/10)*10),z=b.maxZ+.08;
    c.lineWidth=1;c.strokeStyle='rgba(140,180,199,.13)';
    const minX=Math.ceil(b.minX/step)*step,maxX=Math.floor(b.maxX/step)*step,minY=Math.ceil(b.minY/step)*step,maxY=Math.floor(b.maxY/step)*step;
    for(let x=minX;x<=maxX;x+=step){const a=this.projection(x,b.minY,z),d=this.projection(x,b.maxY,z);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(d.x,d.y);c.stroke();}
    for(let y=minY;y<=maxY;y+=step){const a=this.projection(b.minX,y,z),d=this.projection(b.maxX,y,z);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(d.x,d.y);c.stroke();}
  }

  drawPoly(points,fill,stroke=null,width=1){
    const c=this.ctx,p=points.map(v=>this.projection(v.x,v.y,v.z));
    c.beginPath();c.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)c.lineTo(p[i].x,p[i].y);c.closePath();
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }

  drawBox(bounds,colors,stroke){
    const b=bounds,faces=[
      {pts:[{x:b.minX,y:b.minY,z:b.maxZ},{x:b.maxX,y:b.minY,z:b.maxZ},{x:b.maxX,y:b.minY,z:b.minZ},{x:b.minX,y:b.minY,z:b.minZ}],color:colors.front},
      {pts:[{x:b.maxX,y:b.minY,z:b.maxZ},{x:b.maxX,y:b.maxY,z:b.maxZ},{x:b.maxX,y:b.maxY,z:b.minZ},{x:b.maxX,y:b.minY,z:b.minZ}],color:colors.right},
      {pts:[{x:b.maxX,y:b.maxY,z:b.maxZ},{x:b.minX,y:b.maxY,z:b.maxZ},{x:b.minX,y:b.maxY,z:b.minZ},{x:b.maxX,y:b.maxY,z:b.minZ}],color:colors.back},
      {pts:[{x:b.minX,y:b.maxY,z:b.maxZ},{x:b.minX,y:b.minY,z:b.maxZ},{x:b.minX,y:b.minY,z:b.minZ},{x:b.minX,y:b.maxY,z:b.minZ}],color:colors.left},
      {pts:[{x:b.minX,y:b.minY,z:b.minZ},{x:b.maxX,y:b.minY,z:b.minZ},{x:b.maxX,y:b.maxY,z:b.minZ},{x:b.minX,y:b.maxY,z:b.minZ}],color:colors.bottom},
      {pts:[{x:b.minX,y:b.minY,z:b.maxZ},{x:b.maxX,y:b.minY,z:b.maxZ},{x:b.maxX,y:b.maxY,z:b.maxZ},{x:b.minX,y:b.maxY,z:b.maxZ}],color:colors.top}
    ];
    faces.forEach(f=>f.depth=f.pts.reduce((sum,p)=>sum+this.rawProjection(p).depth,0)/4);
    faces.sort((a,d)=>a.depth-d.depth).forEach(f=>this.drawPoly(f.pts,f.color,stroke));
  }

  drawTable(){
    const c=this.ctx,b=this.tableBounds();
    this.drawBox(b,{top:'#526873',front:'#334751',right:'#2b3e47',back:'#354b55',left:'#405761',bottom:'#1c2b32'},'rgba(160,205,224,.28)');
    const count=Math.max(3,Math.min(11,Math.round((this.cfg.table.slotDirection==='x'?this.cfg.table.y:this.cfg.table.x)/55))),z=b.maxZ+.15;
    c.lineCap='round';
    for(let i=1;i<count;i++){
      const ratio=i/count;
      let a,d;
      if(this.cfg.table.slotDirection==='x'){const y=b.minY+(b.maxY-b.minY)*ratio;a=this.projection(b.minX,y,z);d=this.projection(b.maxX,y,z);}else{const x=b.minX+(b.maxX-b.minX)*ratio;a=this.projection(x,b.minY,z);d=this.projection(x,b.maxY,z);}
      c.strokeStyle='rgba(8,20,27,.88)';c.lineWidth=5;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(d.x,d.y);c.stroke();
      c.strokeStyle='rgba(165,204,220,.20)';c.lineWidth=1;c.beginPath();c.moveTo(a.x,a.y-1);c.lineTo(d.x,d.y-1);c.stroke();
    }
    c.lineCap='butt';
  }

  drawStock(){
    const c=this.ctx,b=this.stockBounds();
    this.drawBox(b,{top:'#d5ad3f',front:'#6f541c',right:'#5a461c',back:'#644b19',left:'#78591d',bottom:'#352c1a'},'rgba(255,210,31,.20)');
    const profile=this.qualitySettings();
    const cells=(this.nx-1)*(this.ny-1),stride=Math.max(1,Math.ceil(Math.sqrt(cells/profile.tileBudget))),tiles=[];
    for(let j=0;j<this.ny-1;j+=stride)for(let i=0;i<this.nx-1;i+=stride){
      const i2=Math.min(this.nx-1,i+stride),j2=Math.min(this.ny-1,j+stride),x1=b.minX+i*this.cfg.resolution,x2=Math.min(b.maxX,b.minX+i2*this.cfg.resolution),y1=b.minY+j*this.cfg.resolution,y2=Math.min(b.maxY,b.minY+j2*this.cfg.resolution);
      const d1=this.depth[j*this.nx+i],d2=this.depth[j*this.nx+i2],d3=this.depth[j2*this.nx+i2],d4=this.depth[j2*this.nx+i];
      const pts=[{x:x1,y:y1,z:b.maxZ-d1},{x:x2,y:y1,z:b.maxZ-d2},{x:x2,y:y2,z:b.maxZ-d3},{x:x1,y:y2,z:b.maxZ-d4}],avg=(d1+d2+d3+d4)/4;
      tiles.push({pts,avg,depth:pts.reduce((sum,p)=>sum+this.rawProjection(p).depth,0)/4});
    }
    tiles.sort((a,d)=>a.depth-d.depth);
    for(const t of tiles){const ratio=clamp(t.avg/this.cfg.z,0,1),r=Math.round(211-106*ratio),g=Math.round(173-96*ratio),bl=Math.round(63-25*ratio);this.drawPoly(t.pts,`rgb(${r},${g},${bl})`,ratio>.02?'rgba(55,70,77,.20)':null);}
    this.drawCutMarks3D();
    const o=this.cfg.position,p=this.projection(o.x,o.y,b.maxZ+.3);c.fillStyle='#fff2a0';c.beginPath();c.arc(p.x,p.y,3.5,0,Math.PI*2);c.fill();c.font='700 9px system-ui';c.fillText('ORIGEN PIEZA',p.x+7,p.y-6);
  }

  drawCutWalls3D(stride=1){
    const b=this.stockBounds(),faces=[],threshold=Math.max(.25,this.cfg.resolution*.18),cell=this.cfg.resolution;
    const avgAt=(i,j)=>{
      const i2=Math.min(this.nx-1,i+stride),j2=Math.min(this.ny-1,j+stride);
      return (this.depth[j*this.nx+i]+this.depth[j*this.nx+i2]+this.depth[j2*this.nx+i2]+this.depth[j2*this.nx+i])/4;
    };
    for(let j=0;j<this.ny-1;j+=stride)for(let i=0;i<this.nx-1;i+=stride){
      const current=avgAt(i,j),i2=Math.min(this.nx-1,i+stride),j2=Math.min(this.ny-1,j+stride),x1=b.minX+i*cell,x2=Math.min(b.maxX,b.minX+i2*cell),y1=b.minY+j*cell,y2=Math.min(b.maxY,b.minY+j2*cell);
      if(i2<this.nx-1){
        const next=avgAt(i2,j),delta=Math.abs(current-next);
        if(delta>threshold){const hi=Math.min(current,next),lo=Math.max(current,next),pts=[{x:x2,y:y1,z:b.maxZ-hi},{x:x2,y:y2,z:b.maxZ-hi},{x:x2,y:y2,z:b.maxZ-lo},{x:x2,y:y1,z:b.maxZ-lo}];faces.push({pts,color:current>next?'#5f4319':'#765723',depth:pts.reduce((s,p)=>s+this.rawProjection(p).depth,0)/4});}
      }
      if(j2<this.ny-1){
        const next=avgAt(i,j2),delta=Math.abs(current-next);
        if(delta>threshold){const hi=Math.min(current,next),lo=Math.max(current,next),pts=[{x:x1,y:y2,z:b.maxZ-hi},{x:x2,y:y2,z:b.maxZ-hi},{x:x2,y:y2,z:b.maxZ-lo},{x:x1,y:y2,z:b.maxZ-lo}];faces.push({pts,color:current>next?'#543b17':'#6d4d1c',depth:pts.reduce((s,p)=>s+this.rawProjection(p).depth,0)/4});}
      }
    }
    faces.sort((a,d)=>a.depth-d.depth);for(const face of faces)this.drawPoly(face.pts,face.color,'rgba(28,20,8,.25)',.45);
  }

  drawCavity3D(mark){
    const b=this.stockBounds(),profile=this.qualitySettings(),segments=profile.circleSegments,topZ=b.maxZ+.12,bottomZ=Math.max(b.minZ,mark.bottomZ),isPointed=mark.toolType==='drill'||mark.toolType==='chamfer',halfAngle=clamp((mark.toolAngle||90)/2,8,88)*Math.PI/180,tipRise=isPointed?Math.min(mark.depth*.42,mark.radius/Math.tan(halfAngle)):0,wallBottom=Math.min(topZ,Math.max(bottomZ,bottomZ+tipRise)),walls=[];
    this.drawCirclePlane3D(mark.x,mark.y,topZ,mark.radius,segments,'rgba(29,20,9,.94)','rgba(255,226,146,.66)',1.15);
    for(let i=0;i<segments;i++){
      const a1=i/segments*Math.PI*2,a2=(i+1)/segments*Math.PI*2,p1={x:mark.x+Math.cos(a1)*mark.radius,y:mark.y+Math.sin(a1)*mark.radius,z:topZ},p2={x:mark.x+Math.cos(a2)*mark.radius,y:mark.y+Math.sin(a2)*mark.radius,z:topZ},p3={x:p2.x,y:p2.y,z:wallBottom},p4={x:p1.x,y:p1.y,z:wallBottom},mid=(a1+a2)/2,light=.42+.34*Math.max(0,Math.cos(mid+this.camera.yaw));
      walls.push({pts:[p1,p2,p3,p4],color:`rgb(${Math.round(97*light)},${Math.round(72*light)},${Math.round(30*light)})`,depth:[p1,p2,p3,p4].reduce((s,p)=>s+this.rawProjection(p).depth,0)/4});
    }
    walls.sort((a,d)=>a.depth-d.depth);for(const wall of walls)this.drawPoly(wall.pts,wall.color,'rgba(18,12,5,.36)',.55);
    if(isPointed){
      const tip={x:mark.x,y:mark.y,z:bottomZ},cones=[];
      for(let i=0;i<segments;i++){
        const a1=i/segments*Math.PI*2,a2=(i+1)/segments*Math.PI*2,p1={x:mark.x+Math.cos(a1)*mark.radius,y:mark.y+Math.sin(a1)*mark.radius,z:wallBottom},p2={x:mark.x+Math.cos(a2)*mark.radius,y:mark.y+Math.sin(a2)*mark.radius,z:wallBottom};
        cones.push({pts:[p1,p2,tip],depth:[p1,p2,tip].reduce((s,p)=>s+this.rawProjection(p).depth,0)/3});
      }
      cones.sort((a,d)=>a.depth-d.depth);for(const face of cones)this.drawPoly(face.pts,'#34230d','rgba(16,10,4,.3)',.45);
    }else{
      this.drawCirclePlane3D(mark.x,mark.y,bottomZ,mark.radius*.94,segments,'#2d1e0b','rgba(111,82,32,.58)',.8);
    }
    this.drawCirclePlane3D(mark.x,mark.y,topZ+.02,mark.radius,segments,null,'rgba(255,236,172,.84)',1.3);
  }

  drawCirclePlane3D(x,y,z,radius,segments=18,fill=null,stroke=null,width=1){
    const pts=[];
    for(let i=0;i<segments;i++){
      const a=i/segments*Math.PI*2;
      pts.push({x:x+Math.cos(a)*radius,y:y+Math.sin(a)*radius,z});
    }
    this.drawPoly(pts,fill,stroke,width);
  }

  drawCutMarks3D(){
    const b=this.stockBounds(),profile=this.qualitySettings();
    for(const mark of this.cutMarks){
      const inset=Math.min(mark.depth*.15,Math.max(.8,this.cfg.resolution*.45));
      this.drawCirclePlane3D(mark.x,mark.y,b.maxZ-inset,mark.radius,profile.circleSegments,`rgba(33,22,11,${0.55+clamp(mark.depth/this.cfg.z,0,1)*0.24})`,'rgba(255,221,133,.4)',1.1);
      if(mark.depth>this.cfg.resolution*1.2)this.drawCirclePlane3D(mark.x,mark.y,b.maxZ-inset*1.9,mark.radius*.82,Math.max(10,profile.circleSegments-4),'rgba(22,14,8,.22)',null,0);
    }
  }

  drawPath(){
    const c=this.ctx;if(!this.path?.length)return;
    c.lineCap='round';c.lineJoin='round';
    for(let i=0;i<this.path.length;i++){
      const s=this.path[i];if(s.kind!=='move'||(s.type==='G00'&&!this.showRapids))continue;
      const a=this.projection(s.from.x,s.from.y,s.from.z),b=this.projection(s.to.x,s.to.y,s.to.z),done=i<=this.current;
      c.strokeStyle=done?(s.type==='G00'?'rgba(66,199,255,.76)':'rgba(76,255,165,.98)'):(s.type==='G00'?'rgba(66,199,255,.24)':'rgba(226,236,241,.34)');
      c.setLineDash(s.type==='G00'?[6,5]:[]);c.lineWidth=i===this.current?3:1.35;c.shadowColor=i===this.current?'rgba(255,210,31,.35)':'transparent';c.shadowBlur=i===this.current?6:0;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    }
    c.setLineDash([]);c.shadowBlur=0;c.lineCap='butt';c.lineJoin='miter';
  }

  drawTool(){
    const c=this.ctx,tool=this.currentTool,r=Math.max(.5,(tool.diameter||10)/2),length=Math.max(20,tool.length||50),p=this.projection(this.toolPos.x,this.toolPos.y,this.toolPos.z),top=this.projection(this.toolPos.x,this.toolPos.y,this.toolPos.z+length),rx=this.projection(this.toolPos.x+r,this.toolPos.y,this.toolPos.z),ry=this.projection(this.toolPos.x,this.toolPos.y+r,this.toolPos.z),screenR=Math.max(3,Math.min(38,Math.max(Math.hypot(rx.x-p.x,rx.y-p.y),Math.hypot(ry.x-p.x,ry.y-p.y))));
    c.strokeStyle='rgba(232,244,250,.92)';c.lineWidth=Math.max(3,Math.min(9,screenR*.45));c.lineCap='round';c.beginPath();c.moveTo(p.x,p.y);c.lineTo(top.x,top.y);c.stroke();
    c.fillStyle='#ffd21f';c.strokeStyle='#1a1e20';c.lineWidth=1.2;
    if(tool.type==='ball'){c.beginPath();c.arc(p.x,p.y,screenR,0,Math.PI*2);c.fill();c.stroke();}
    else if(tool.type==='drill'||tool.type==='chamfer'){c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x-screenR,p.y-screenR*.75);c.lineTo(p.x+screenR,p.y-screenR*.75);c.closePath();c.fill();c.stroke();}
    else{const h=tool.type==='face'?Math.max(6,screenR*.55):Math.max(4,screenR*.35);c.fillRect(p.x-screenR,p.y-h,screenR*2,h);c.strokeRect(p.x-screenR,p.y-h,screenR*2,h);}
    c.lineCap='butt';
  }

  drawAxes(){
    const c=this.ctx,origin=this.projection(0,0,0),len=Math.max(25,Math.min(this.cfg.table.x,this.cfg.table.y)*.13),axes=[['X',len,0,0,'#ff6471'],['Y',0,len,0,'#56e49d'],['Z',0,0,len,'#55bfff']];
    c.font='700 11px system-ui';c.lineWidth=2;
    for(const [label,x,y,z,color] of axes){const p=this.projection(x,y,z);c.strokeStyle=color;c.fillStyle=color;c.beginPath();c.moveTo(origin.x,origin.y);c.lineTo(p.x,p.y);c.stroke();c.fillText(label,p.x+4,p.y-4);}
    const ox=44,oy=this.h-42,size=22,basis=this.basis(),screenVec=v=>({x:v.x*basis.right.x+v.y*basis.right.y+v.z*basis.right.z,y:-(v.x*basis.up.x+v.y*basis.up.y+v.z*basis.up.z)});
    for(const [label,v,color] of [['X',{x:1,y:0,z:0},'#ff6471'],['Y',{x:0,y:1,z:0},'#56e49d'],['Z',{x:0,y:0,z:1},'#55bfff']]){const q=screenVec(v);c.strokeStyle=color;c.fillStyle=color;c.beginPath();c.moveTo(ox,oy);c.lineTo(ox+q.x*size,oy+q.y*size);c.stroke();c.fillText(label,ox+q.x*size+3,oy+q.y*size-2);}
  }
}
