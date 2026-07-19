import {CODES,CATEGORIES,SUPPORT_LABELS} from './gcode-data.js?v=4.6.0';
import {FanucInterpreter} from './interpreter.js?v=4.6.0';
import {StockSimulator} from './simulator.js?v=4.6.0';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const deepClone=value=>JSON.parse(JSON.stringify(value));
const formatNumber=value=>{const n=Number(value);return Number.isFinite(n)?String(Number(n.toFixed(5))):String(value);};
const UNIT_SCALE={mm:1,in:25.4};
const TOOL_TYPES={flat:'Fresa plana',ball:'Punta bola',face:'Fresa de planeado',drill:'Broca',chamfer:'Avellanador / chaflán'};
const DEFAULT_WORKSPACE={units:'mm',x:220,y:120,z:30,resolution:1.5,renderQuality:'high',zeroMode:'corner',position:{x:0,y:0},table:{x:600,y:400,z:40,topZ:-30,slotDirection:'x'}};
const CUTTER_LIBRARY=[
  {id:'m-flat-3',system:'mm',type:'flat',name:'Fresa plana Ø3 mm',diameter:3,length:45},{id:'m-flat-4',system:'mm',type:'flat',name:'Fresa plana Ø4 mm',diameter:4,length:50},{id:'m-flat-5',system:'mm',type:'flat',name:'Fresa plana Ø5 mm',diameter:5,length:52},{id:'m-flat-6',system:'mm',type:'flat',name:'Fresa plana Ø6 mm',diameter:6,length:55},{id:'m-flat-8',system:'mm',type:'flat',name:'Fresa plana Ø8 mm',diameter:8,length:60},{id:'m-flat-10',system:'mm',type:'flat',name:'Fresa plana Ø10 mm',diameter:10,length:70},{id:'m-flat-12',system:'mm',type:'flat',name:'Fresa plana Ø12 mm',diameter:12,length:75},{id:'m-flat-16',system:'mm',type:'flat',name:'Fresa plana Ø16 mm',diameter:16,length:90},{id:'m-flat-20',system:'mm',type:'flat',name:'Fresa plana Ø20 mm',diameter:20,length:100},
  {id:'m-ball-3',system:'mm',type:'ball',name:'Punta bola Ø3 mm',diameter:3,length:48},{id:'m-ball-4',system:'mm',type:'ball',name:'Punta bola Ø4 mm',diameter:4,length:50},{id:'m-ball-5',system:'mm',type:'ball',name:'Punta bola Ø5 mm',diameter:5,length:55},{id:'m-ball-6',system:'mm',type:'ball',name:'Punta bola Ø6 mm',diameter:6,length:60},{id:'m-ball-8',system:'mm',type:'ball',name:'Punta bola Ø8 mm',diameter:8,length:70},{id:'m-ball-10',system:'mm',type:'ball',name:'Punta bola Ø10 mm',diameter:10,length:75},{id:'m-ball-12',system:'mm',type:'ball',name:'Punta bola Ø12 mm',diameter:12,length:80},
  {id:'m-face-40',system:'mm',type:'face',name:'Fresa de planeado Ø40 mm',diameter:40,length:45},{id:'m-face-50',system:'mm',type:'face',name:'Fresa de planeado Ø50 mm',diameter:50,length:50},{id:'m-face-63',system:'mm',type:'face',name:'Fresa de planeado Ø63 mm',diameter:63,length:55},
  {id:'m-drill-3',system:'mm',type:'drill',name:'Broca Ø3 mm · 118°',diameter:3,length:60,angle:118},{id:'m-drill-5',system:'mm',type:'drill',name:'Broca Ø5 mm · 118°',diameter:5,length:75,angle:118},{id:'m-drill-6',system:'mm',type:'drill',name:'Broca Ø6 mm · 118°',diameter:6,length:80,angle:118},{id:'m-drill-8',system:'mm',type:'drill',name:'Broca Ø8 mm · 118°',diameter:8,length:95,angle:118},{id:'m-drill-10',system:'mm',type:'drill',name:'Broca Ø10 mm · 118°',diameter:10,length:110,angle:118},{id:'m-drill-12',system:'mm',type:'drill',name:'Broca Ø12 mm · 118°',diameter:12,length:125,angle:118},
  {id:'m-chamfer-6',system:'mm',type:'chamfer',name:'Avellanador Ø6 mm · 90°',diameter:6,length:50,angle:90},{id:'m-chamfer-10',system:'mm',type:'chamfer',name:'Avellanador Ø10 mm · 90°',diameter:10,length:60,angle:90},{id:'m-chamfer-12',system:'mm',type:'chamfer',name:'Avellanador Ø12 mm · 90°',diameter:12,length:65,angle:90},
  {id:'i-flat-1_8',system:'in',type:'flat',name:'Fresa plana 1/8 in',diameter:3.175,length:50.8},{id:'i-flat-3_16',system:'in',type:'flat',name:'Fresa plana 3/16 in',diameter:4.7625,length:57.15},{id:'i-flat-1_4',system:'in',type:'flat',name:'Fresa plana 1/4 in',diameter:6.35,length:63.5},{id:'i-flat-3_8',system:'in',type:'flat',name:'Fresa plana 3/8 in',diameter:9.525,length:76.2},{id:'i-flat-1_2',system:'in',type:'flat',name:'Fresa plana 1/2 in',diameter:12.7,length:88.9},{id:'i-flat-5_8',system:'in',type:'flat',name:'Fresa plana 5/8 in',diameter:15.875,length:101.6},{id:'i-flat-3_4',system:'in',type:'flat',name:'Fresa plana 3/4 in',diameter:19.05,length:114.3},{id:'i-flat-1',system:'in',type:'flat',name:'Fresa plana 1 in',diameter:25.4,length:127},
  {id:'i-ball-1_8',system:'in',type:'ball',name:'Punta bola 1/8 in',diameter:3.175,length:50.8},{id:'i-ball-1_4',system:'in',type:'ball',name:'Punta bola 1/4 in',diameter:6.35,length:63.5},{id:'i-ball-3_8',system:'in',type:'ball',name:'Punta bola 3/8 in',diameter:9.525,length:76.2},{id:'i-ball-1_2',system:'in',type:'ball',name:'Punta bola 1/2 in',diameter:12.7,length:88.9},
  {id:'i-face-1_5',system:'in',type:'face',name:'Fresa de planeado 1 1/2 in',diameter:38.1,length:44.45},{id:'i-face-2',system:'in',type:'face',name:'Fresa de planeado 2 in',diameter:50.8,length:50.8},{id:'i-face-2_5',system:'in',type:'face',name:'Fresa de planeado 2 1/2 in',diameter:63.5,length:57.15},
  {id:'i-drill-1_8',system:'in',type:'drill',name:'Broca 1/8 in · 118°',diameter:3.175,length:63.5,angle:118},{id:'i-drill-3_16',system:'in',type:'drill',name:'Broca 3/16 in · 118°',diameter:4.7625,length:76.2,angle:118},{id:'i-drill-1_4',system:'in',type:'drill',name:'Broca 1/4 in · 118°',diameter:6.35,length:88.9,angle:118},{id:'i-drill-5_16',system:'in',type:'drill',name:'Broca 5/16 in · 118°',diameter:7.9375,length:95.25,angle:118},{id:'i-drill-3_8',system:'in',type:'drill',name:'Broca 3/8 in · 118°',diameter:9.525,length:101.6,angle:118},{id:'i-drill-1_2',system:'in',type:'drill',name:'Broca 1/2 in · 118°',diameter:12.7,length:127,angle:118},
  {id:'i-chamfer-1_4',system:'in',type:'chamfer',name:'Avellanador 1/4 in · 90°',diameter:6.35,length:50.8,angle:90},{id:'i-chamfer-3_8',system:'in',type:'chamfer',name:'Avellanador 3/8 in · 90°',diameter:9.525,length:63.5,angle:90},{id:'i-chamfer-1_2',system:'in',type:'chamfer',name:'Avellanador 1/2 in · 90°',diameter:12.7,length:76.2,angle:90}
];


const DEFAULT_TOOL_ASSIGNMENTS={
  3:'m-flat-3',4:'m-flat-4',5:'m-flat-5',6:'m-flat-6',8:'m-flat-8',10:'m-flat-10',12:'m-flat-12',16:'m-flat-16',20:'m-flat-20',
  31:'m-ball-3',34:'m-ball-4',35:'m-ball-5',36:'m-ball-6',38:'m-ball-8',40:'m-ball-10',42:'m-ball-12',
  53:'m-drill-3',55:'m-drill-5',56:'m-drill-6',58:'m-drill-8',60:'m-drill-10',62:'m-drill-12',
  70:'m-face-40',71:'m-face-50',72:'m-face-63',86:'m-chamfer-6',90:'m-chamfer-10',92:'m-chamfer-12',
  201:'i-flat-1_8',202:'i-flat-3_16',203:'i-flat-1_4',204:'i-flat-3_8',205:'i-flat-1_2',206:'i-flat-5_8',207:'i-flat-3_4',208:'i-flat-1',
  221:'i-ball-1_8',222:'i-ball-1_4',223:'i-ball-3_8',224:'i-ball-1_2',
  241:'i-drill-1_8',242:'i-drill-3_16',243:'i-drill-1_4',244:'i-drill-5_16',245:'i-drill-3_8',246:'i-drill-1_2'
};
function toolFromPreset(presetId){const preset=CUTTER_LIBRARY.find(item=>item.id===presetId);if(!preset)return null;return{diameter:preset.diameter,length:preset.length,type:preset.type,name:preset.name,angle:preset.angle||90,displayUnit:preset.system,presetId:preset.id};}
function createDefaultToolTable(){const table={};for(const [number,presetId] of Object.entries(DEFAULT_TOOL_ASSIGNMENTS)){const tool=toolFromPreset(presetId);if(tool)table[number]=tool;}return table;}

const editor=$('#codeEditor'),lineNumbers=$('#lineNumbers'),canvas=$('#simCanvas'),sim=new StockSimulator(canvas);
const appRoot=$('#appRoot'),mainArea=$('.main-area'),workbench=$('#workbench');

const config={stockTop:0,stockBounds:null,workspace:deepClone(DEFAULT_WORKSPACE),offsets:{},tools:createDefaultToolTable()};
for(let n=54;n<=59;n++)config.offsets[`G${n}`]={x:0,y:0,z:0};

let interpreter=new FanucInterpreter(config),compiledSteps=[],runIndex=-1,animation=null,activeAc=0,acMatches=[];
let currentFileName='programa_fanuc.nc',dirty=false,selectedOffset='G54',offsetDraft=null,toastTimer=null,autosaveTimer=null;

const EXAMPLE=`O0020 (PROGRAMA PRINCIPAL)
G17 G21 G90 G40 G49 G80
T03 M06
G54
M03 S6000
G00 X-80.0 Y20.0
G43 H03 Z20.0
M98 P1000 L3
G90 G00 X-80.0 Y-40.0
M98 P1000 L3
M05 M09
G91 G28 Z0
G90
M30

O1000 (MACRO DE PASADAS EN Z)
G91 G00 X100.0
G90 G00 Z-8.0
#100 = -10.0
WHILE [#100 GT -25.0] DO1
  #100 = [#100 - 5.0]
  IF [#100 LT -25.0] THEN #100 = -25.0
  G01 Z#100 F180
  M98 P1001
END1
G00 Z20.0
M99

O1001 (CONTORNO DE PRUEBA)
G01 X0 Y0 F350
G01 X40 Y0
G03 X60 Y20 I0 J20
G01 Y40
G01 X0
G01 Y0
M99`;

const history={items:[],index:-1,locked:false,timer:null,max:160};
function resetHistory(text){clearTimeout(history.timer);history.items=[{text,start:0,end:0}];history.index=0;history.locked=false;}
function commitHistory(){
  clearTimeout(history.timer);
  if(history.locked)return;
  const snapshot={text:editor.value,start:editor.selectionStart,end:editor.selectionEnd},current=history.items[history.index];
  if(current?.text===snapshot.text){current.start=snapshot.start;current.end=snapshot.end;return;}
  history.items=history.items.slice(0,history.index+1);history.items.push(snapshot);
  if(history.items.length>history.max)history.items.shift();else history.index++;
}
function scheduleHistory(){clearTimeout(history.timer);history.timer=setTimeout(commitHistory,220);}
function applyHistory(index){
  if(index<0||index>=history.items.length)return;
  clearTimeout(history.timer);history.index=index;const item=history.items[index];history.locked=true;editor.value=item.text;editor.setSelectionRange(item.start,item.end);history.locked=false;
  afterEditorChange(false);editor.focus();
}
function undo(){commitHistory();if(history.index>0){applyHistory(history.index-1);toast('Cambio deshecho');}}
function redo(){commitHistory();if(history.index<history.items.length-1){applyHistory(history.index+1);toast('Cambio rehecho');}}
function replaceEditor(text,{name=currentFileName,mark=true,reset=false,selection=null}={}){
  if(!reset)commitHistory();history.locked=true;editor.value=text;history.locked=false;
  currentFileName=name;$('#programName').textContent=name;
  if(selection)editor.setSelectionRange(selection[0],selection[1]);else editor.setSelectionRange(0,0);
  if(reset)resetHistory(text);else commitHistory();
  setDirty(mark);afterEditorChange(false);
}

function setDirty(value=true){dirty=value;$('#dirtyMark').classList.toggle('hidden',!dirty);}
function setStatus(message){$('#statusMessage').textContent=message;}
function toast(message,type='ok'){
  clearTimeout(toastTimer);const el=$('#toast');el.textContent=message;el.className=`toast ${type==='error'?'error':''}`;toastTimer=setTimeout(()=>el.classList.add('hidden'),2400);
}
function queueAutosave(){clearTimeout(autosaveTimer);autosaveTimer=setTimeout(()=>saveLocal(false),900);}

function updateEditorChrome(){
  const total=editor.value.split('\n').length;lineNumbers.textContent=Array.from({length:total},(_,i)=>String(i+1)).join('\n');lineNumbers.scrollTop=editor.scrollTop;
  const pos=editor.selectionStart,before=editor.value.slice(0,pos),line=before.split('\n').length,column=pos-before.lastIndexOf('\n');
  $('#cursorStatus').textContent=`Ln ${line}, Col ${column}`;
  const selection=Math.abs(editor.selectionEnd-editor.selectionStart);$('#selectionStatus').textContent=selection?`${selection} caracteres seleccionados`:'Sin selección';
}
function afterEditorChange(showAc=true){updateEditorChrome();if(showAc)showAutocomplete();setDirty(true);queueAutosave();}

const normalizeWorkspace=raw=>{
  const source=raw||{},z=Number(source.z)||DEFAULT_WORKSPACE.z,table=source.table||{};
  return{units:source.units==='in'?'in':'mm',x:Number(source.x)||DEFAULT_WORKSPACE.x,y:Number(source.y)||DEFAULT_WORKSPACE.y,z,
    resolution:Number(source.resolution)||DEFAULT_WORKSPACE.resolution,renderQuality:['low','medium','high','ultra'].includes(source.renderQuality)?source.renderQuality:DEFAULT_WORKSPACE.renderQuality,zeroMode:source.zeroMode==='center'?'center':'corner',
    position:{x:Number(source.position?.x)||0,y:Number(source.position?.y)||0},
    table:{x:Number(table.x)||DEFAULT_WORKSPACE.table.x,y:Number(table.y)||DEFAULT_WORKSPACE.table.y,z:Number(table.z)||DEFAULT_WORKSPACE.table.z,
      topZ:Number.isFinite(Number(table.topZ))?Number(table.topZ):-z,slotDirection:table.slotDirection==='y'?'y':'x'}};
};
const lengthInUnit=(mm,unit)=>Number((Number(mm)/(UNIT_SCALE[unit]||1)).toFixed(unit==='in'?5:3));
const lengthToMm=(value,unit)=>Number(value)*(UNIT_SCALE[unit]||1);
const unitLabel=unit=>unit==='in'?'in':'mm';
let stockDisplayUnit='mm',toolDisplayUnit='mm';
function pieceOrigin(s=config.workspace){return{x:s.position.x,y:s.position.y,z:s.table.topZ+s.z};}
function pieceBounds(s=config.workspace){const o=pieceOrigin(s);return s.zeroMode==='center'?{minX:o.x-s.x/2,maxX:o.x+s.x/2,minY:o.y-s.y/2,maxY:o.y+s.y/2,minZ:s.table.topZ,maxZ:o.z}:{minX:o.x,maxX:o.x+s.x,minY:o.y,maxY:o.y+s.y,minZ:s.table.topZ,maxZ:o.z};}
function syncWorkspaceConfig(s){config.workspace=normalizeWorkspace(s);config.stockTop=pieceOrigin(config.workspace).z;config.stockBounds=pieceBounds(config.workspace);}
function writeStockLength(id,mm,unit=stockDisplayUnit){$(id).value=lengthInUnit(mm,unit);}
function refreshStockUnits(){const mark=`(${unitLabel(stockDisplayUnit)})`;$$('.unit-mark').forEach(el=>el.textContent=mark);$('#stockUnit').value=stockDisplayUnit;updatePiecePositionInfo();}
function setStockForm(raw=config.workspace){const s=normalizeWorkspace(raw);stockDisplayUnit=s.units;writeStockLength('#tableX',s.table.x);writeStockLength('#tableY',s.table.y);writeStockLength('#tableZ',s.table.z);writeStockLength('#tableTopZ',s.table.topZ);writeStockLength('#stockX',s.x);writeStockLength('#stockY',s.y);writeStockLength('#stockZ',s.z);writeStockLength('#stockPosX',s.position.x);writeStockLength('#stockPosY',s.position.y);$('#zeroMode').value=s.zeroMode;$('#resolution').value=String(s.resolution);$('#renderQuality').value=s.renderQuality;$('#tableSlotDirection').value=s.table.slotDirection;refreshStockUnits();}
function stockSettings(){const u=$('#stockUnit').value;return normalizeWorkspace({units:u,x:lengthToMm($('#stockX').value,u),y:lengthToMm($('#stockY').value,u),z:lengthToMm($('#stockZ').value,u),resolution:+$('#resolution').value||1.5,renderQuality:$('#renderQuality').value||'high',zeroMode:$('#zeroMode').value,position:{x:lengthToMm($('#stockPosX').value,u),y:lengthToMm($('#stockPosY').value,u)},table:{x:lengthToMm($('#tableX').value,u),y:lengthToMm($('#tableY').value,u),z:lengthToMm($('#tableZ').value,u),topZ:lengthToMm($('#tableTopZ').value,u),slotDirection:$('#tableSlotDirection').value}});}
function updatePiecePositionInfo(){if(!$('#piecePositionInfo'))return;const s=stockSettings(),o=pieceOrigin(s),b=pieceBounds(s),tb={minX:-s.table.x/2,maxX:s.table.x/2,minY:-s.table.y/2,maxY:s.table.y/2},outside=b.minX<tb.minX||b.maxX>tb.maxX||b.minY<tb.minY||b.maxY>tb.maxY;const u=s.units;$('#piecePositionInfo').textContent=`Origen visual de pieza: X${lengthInUnit(o.x,u)} Y${lengthInUnit(o.y,u)} Z${lengthInUnit(o.z,u)} ${unitLabel(u)}.${outside?' Atención: una parte de la pieza queda fuera de la mesa.':''}`;$('#piecePositionInfo').classList.toggle('warning-text',outside);}
function updateSummaries(){
  const s=config.workspace,o=config.offsets.G54||{x:0,y:0,z:0},u=s.units||'mm',toolNumber=+$(`#toolNumber`).value||Object.keys(config.tools).map(Number)[0]||3,tool=config.tools[toolNumber]||config.tools[3];
  $('#stockSummary').textContent=`Mesa ${lengthInUnit(s.table.x,u)} × ${lengthInUnit(s.table.y,u)} · Pieza ${lengthInUnit(s.x,u)} × ${lengthInUnit(s.y,u)} × ${lengthInUnit(s.z,u)} ${unitLabel(u)}`;
  $('#offsetSummary').textContent=`G54 X${lengthInUnit(o.x,u)} Y${lengthInUnit(o.y,u)} Z${lengthInUnit(o.z,u)} ${unitLabel(u)}`;
  const tu=tool?.displayUnit||'mm';$('#toolSummary').textContent=`T${toolNumber} ${tool?.name||TOOL_TYPES[tool?.type]||'Cortador'} · Ø${lengthInUnit(tool?.diameter||10,tu)} ${unitLabel(tu)}`;
}
function applyStock({compile=true,close=true,notify=true}={}){
  const s=stockSettings();syncWorkspaceConfig(s);if($('#syncG54OnApply').checked)config.offsets.G54=pieceOrigin(s);sim.configure(s);sim.setRenderQuality(s.renderQuality);$('#renderQuality').value=s.renderQuality;updateSummaries();if(compile)compileProgram();if(close)$('#stockDialog').close();if(notify)toast('Mesa y pieza actualizadas');
}

function initialRunState(){return compiledSteps[0]?.state||new FanucInterpreter(config).state;}
function renderVariables(){
  const filter=$('#variableFilter').value.trim(),entries=[...interpreter.variables.entries()].sort((a,b)=>a[0]-b[0]).filter(([id])=>!filter||`#${id}`.includes(filter));
  $('#variablesTable').innerHTML=entries.length?entries.map(([id,value])=>`<div class="var-cell"><b>#${id}</b><span>${formatNumber(value)}</span></div>`).join(''):'<div class="empty-state">No hay variables asignadas.</div>';
}
function renderDiagnostics(){
  const list=interpreter.diagnostics;$('#alarmCount').textContent=list.length;
  $('#diagnostics').innerHTML=list.length?list.map(item=>`<div class="diag ${item.type==='error'?'error':item.type==='info'?'info':''}"><b>${item.type==='error'?'ALARMA':item.type==='info'?'INFORMACIÓN':'ADVERTENCIA'} · Línea ${item.line}</b><span>${escapeHtml(item.message)}</span></div>`).join(''):'<div class="empty-state">Sin alarmas. El programa compiló correctamente.</div>';
  const hasError=list.some(item=>item.type==='error');$('#parseStatus').textContent=hasError?`${list.length} incidencias`:'Programa válido';$('#parseStatus').className=hasError?'status-bad':'status-ok';
}
function compileProgram({silent=false}={}){
  stopPlayback();interpreter=new FanucInterpreter(config).parse(editor.value).compile();compiledSteps=interpreter.steps;sim.setPath(compiledSteps);sim.resetCut();runIndex=-1;
  renderVariables();renderDiagnostics();
  $('#traceLog').textContent=interpreter.trace.length?interpreter.trace.join('\n'):`Compilado: ${compiledSteps.length} movimientos, ${interpreter.diagnostics.length} incidencias.`;
  updateHud(initialRunState());
  const errors=interpreter.diagnostics.filter(x=>x.type==='error').length;setStatus(errors?`Compilación con ${errors} error(es)`:`Compilado: ${compiledSteps.length} movimientos`);
  if(!silent)toast(errors?'Hay errores en el programa':'Programa validado',errors?'error':'ok');
  return errors===0;
}
function updateHud(state,step=null){
  const p=step?.to||state.machine||{x:0,y:0,z:0};
  $('#hudX').textContent=Number(p.x||0).toFixed(3);$('#hudY').textContent=Number(p.y||0).toFixed(3);$('#hudZ').textContent=Number(p.z||0).toFixed(3);
  $('#hudWcs').textContent=state.wcs||'G54';$('#hudPlane').textContent=step?.plane||state.plane||'G17';$('#hudMode').textContent=state.distance||'G90';$('#hudUnits').textContent=state.units==='G20'?'in':'mm';
  $('#stateBlock').textContent=step?.line||state.line||'—';$('#stateMotion').textContent=step?.type||state.motion||'G00';$('#stateFeed').textContent=Number(step?.feed??state.feed??0).toFixed(1);
  $('#stateSpindle').textContent=step?.state?.spindle||state.spindle||'OFF';$('#stateRpm').textContent=step?.rpm??state.rpm??0;$('#stateCoolant').textContent=step?.state?.coolant||state.coolant||'OFF';$('#stateTool').textContent=`T${step?.tool??state.tool??0}`;
}
function selectEditorLine(lineNo){
  const rows=editor.value.split('\n');let start=0;for(let i=0;i<lineNo-1;i++)start+=rows[i].length+1;const row=rows[lineNo-1]||'';editor.setSelectionRange(start,start+row.length);editor.focus({preventScroll:true});updateEditorChrome();
}
function stepProgram(){
  if(!compiledSteps.length){if(!compileProgram())return false;}
  if(runIndex>=compiledSteps.length-1){stopPlayback();toast('Fin del programa');return false;}
  const step=compiledSteps[++runIndex];sim.applyStep(step);updateHud(step.state,step);selectEditorLine(step.line);
  if(step.cut&&step.state.spindle==='OFF')showAlarm(`L${step.line}: corte con husillo apagado`);else hideAlarm();
  setStatus(`Ejecutando línea ${step.line} · ${runIndex+1}/${compiledSteps.length}`);return true;
}
function playProgram(){
  if(animation)return;
  if(runIndex<0&&!compileProgram({silent:true})&&interpreter.diagnostics.some(x=>x.type==='error')){toast('Corrige las alarmas antes de ejecutar','error');return;}
  if(runIndex>=compiledSteps.length-1){sim.resetCut();runIndex=-1;}
  const tick=()=>{const amount=Math.max(1,Math.round(+$('#speedRange').value/12));for(let i=0;i<amount;i++)if(!stepProgram()){stopPlayback();return;}animation=requestAnimationFrame(tick);};
  animation=requestAnimationFrame(tick);setStatus('Simulación en ejecución');
}
function stopPlayback(){if(animation)cancelAnimationFrame(animation);animation=null;}
function resetSimulation(){stopPlayback();sim.resetCut();runIndex=-1;hideAlarm();updateHud(initialRunState());setStatus('Simulación reiniciada');}
function showAlarm(text){$('#alarmBanner').textContent=text;$('#alarmBanner').classList.remove('hidden');}
function hideAlarm(){$('#alarmBanner').classList.add('hidden');}

function escapeHtml(value){return String(value).replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));}
function renderDictionary(){
  const q=$('#codeFilter').value.toUpperCase().trim(),category=$('#categoryFilter').value,support=$('#supportFilter').value;
  const matches=CODES.filter(code=>(!q||`${code.code} ${code.name} ${code.description} ${code.example}`.toUpperCase().includes(q))&&(!category||code.category===category)&&(!support||code.support===support));
  $('#codeCount').textContent=matches.length;
  $('#codeDictionary').innerHTML=matches.map((code,index)=>`<article class="code-card" data-code-index="${CODES.indexOf(code)}" title="Clic para insertar el ejemplo en el editor"><div class="code-card-head"><code>${escapeHtml(code.code)}</code><strong>${escapeHtml(code.name)}</strong><span class="category-tag">${escapeHtml(code.category)}</span><span class="support-pill ${code.support}">${SUPPORT_LABELS[code.support]}</span></div><p>${escapeHtml(code.description)}</p><small>${escapeHtml(code.example)}</small></article>`).join('')||'<div class="empty-state">No hay códigos que coincidan con el filtro.</div>';
}
function insertAtCursor(text){
  commitHistory();const start=editor.selectionStart,end=editor.selectionEnd,before=editor.value.slice(0,start),prefix=before&&!before.endsWith('\n')?' ':'';editor.setRangeText(prefix+text,start,end,'end');commitHistory();afterEditorChange(false);editor.focus();
}
function tokenAtCursor(){const before=editor.value.slice(0,editor.selectionStart),match=before.match(/(?:^|[\s\[=])([A-Z][A-Z0-9.]*|#\d*)$/i);return match?match[1].toUpperCase():'';}
function comparable(code){return code.replace(/^([GM])0+(?=\d)/,'$1');}
function showAutocomplete(force=false){
  const token=tokenAtCursor();if(!force&&token.length<1){hideAutocomplete();return;}
  acMatches=CODES.filter(item=>{
    const code=item.code.toUpperCase();return !token||code.startsWith(token)||comparable(code).startsWith(comparable(token))||item.name.toUpperCase().startsWith(token);
  }).slice(0,10);
  if(!acMatches.length){hideAutocomplete();return;}
  activeAc=0;const box=$('#autocomplete'),shell=$('#editorShell');
  box.innerHTML=acMatches.map((item,index)=>`<div class="ac-item ${index===0?'active':''}" data-ac-index="${index}" role="option"><span class="ac-code">${escapeHtml(item.code)}</span><span class="ac-name">${escapeHtml(item.name)}</span><span class="support-pill ${item.support}">${SUPPORT_LABELS[item.support]}</span><span class="ac-detail">${escapeHtml(item.description)}</span></div>`).join('');
  box.scrollTop=0;box.classList.remove('hidden');
  const before=editor.value.slice(0,editor.selectionStart),row=before.split('\n').length-1,col=before.length-before.lastIndexOf('\n')-1,style=getComputedStyle(editor),lineHeight=parseFloat(style.lineHeight)||20.8,paddingTop=parseFloat(style.paddingTop)||12,paddingLeft=parseFloat(style.paddingLeft)||15;
  const anchorY=paddingTop+row*lineHeight-editor.scrollTop,anchorX=48+paddingLeft+col*7.75-editor.scrollLeft;
  const availableAbove=Math.max(58,anchorY-10),maxHeight=Math.min(250,availableAbove),boxHeight=Math.min(box.scrollHeight,maxHeight);
  box.style.maxHeight=`${maxHeight}px`;
  box.style.top=`${Math.max(4,anchorY-boxHeight-8)}px`;
  box.style.left=`${Math.max(52,Math.min(shell.clientWidth-box.offsetWidth-10,anchorX))}px`;
}
function hideAutocomplete(){$('#autocomplete').classList.add('hidden');}
function acceptAutocomplete(item=acMatches[activeAc]){
  if(!item)return;const p=editor.selectionStart,before=editor.value.slice(0,p),match=before.match(/([A-Z][A-Z0-9.]*|#\d*)$/i),start=match?p-match[1].length:p;
  commitHistory();editor.setRangeText(item.code,start,p,'end');commitHistory();hideAutocomplete();afterEditorChange(false);editor.focus();
}
function formatCode(){
  const formatted=editor.value.split('\n').map(line=>{
    const comments=[...line.matchAll(/\([^)]*\)/g)].map(m=>m[0]).join(' '),code=line.replace(/\([^)]*\)/g,'').trim().toUpperCase().replace(/\s*=\s*/g,' = ').replace(/\s+/g,' ');
    return `${code}${code&&comments?' ':''}${comments}`;
  }).join('\n');
  replaceEditor(formatted,{mark:true,selection:[editor.selectionStart,editor.selectionStart]});compileProgram({silent:true});toast('Programa formateado');
}

function projectPayload(){return{format:'FANUC_FORGE_PROJECT',version:4.6,name:currentFileName,code:editor.value,config:deepClone(config),workspace:deepClone(config.workspace),camera:sim.getCamera(),displayMode:sim.viewMode,displayOptions:{showRapids:sim.showRapids,showCuts:sim.showCuts,showGrid:sim.showGrid,showTable:sim.showTable},layout:{editorShare:getComputedStyle(document.documentElement).getPropertyValue('--editor-share').trim(),dockCollapsed:mainArea.classList.contains('dock-collapsed')}};}
function downloadText(text,name,type='text/plain'){
  const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function saveProgram(){commitHistory();const name=/\.(nc|tap|txt|cnc|gcode)$/i.test(currentFileName)?currentFileName:`${currentFileName}.nc`;downloadText(editor.value,name);setDirty(false);setStatus(`Guardado ${name}`);toast('Programa .NC guardado');}
function saveProject(){const name=currentFileName.replace(/\.[^.]+$/,'')||'proyecto_fanuc';downloadText(JSON.stringify(projectPayload(),null,2),`${name}.ffcnc`,'application/json');setDirty(false);toast('Proyecto completo guardado');}
function saveLocal(notify=true){localStorage.setItem('fanucForgeProjectV45',JSON.stringify(projectPayload()));if(notify)toast('Recuperación local guardada');}
function loadLocal(){const raw=localStorage.getItem('fanucForgeProjectV45')||localStorage.getItem('fanucForgeProjectV4')||localStorage.getItem('fanucForgeProjectV3')||localStorage.getItem('fanucForgeProjectV2');if(!raw){toast('No existe una recuperación local','error');return;}try{loadProjectObject(JSON.parse(raw));toast('Proyecto local recuperado');}catch(error){toast(`No se pudo recuperar: ${error.message}`,'error');}}
function loadProjectObject(project){
  if(project.format!=='FANUC_FORGE_PROJECT'&&!project.code)throw new Error('formato de proyecto no reconocido');
  if(project.config){config.offsets=project.config.offsets||config.offsets;config.tools={...createDefaultToolTable(),...(project.config.tools||{})};}
  for(const [id,tool] of Object.entries(config.tools))config.tools[id]={type:'flat',name:`Fresa plana Ø${tool.diameter||10} mm`,angle:90,displayUnit:'mm',...tool};
  const workspace=normalizeWorkspace(project.workspace||project.stock||project.config?.workspace||DEFAULT_WORKSPACE);syncWorkspaceConfig(workspace);setStockForm(workspace);sim.configure(workspace);
  replaceEditor(project.code||'',{name:project.name||'proyecto_fanuc.nc',mark:false,reset:true});if(project.camera)sim.setCamera(project.camera);
  if(project.layout?.editorShare)document.documentElement.style.setProperty('--editor-share',project.layout.editorShare);mainArea.classList.toggle('dock-collapsed',!!project.layout?.dockCollapsed);
  setDisplayMode(project.displayMode||'3d');
  if(project.displayOptions){
    sim.showRapids=project.displayOptions.showRapids!==false;sim.showCuts=project.displayOptions.showCuts!==false;sim.showGrid=project.displayOptions.showGrid!==false;sim.showTable=project.displayOptions.showTable!==false;
    $('#showRapids').checked=sim.showRapids;$('#showCuts').checked=sim.showCuts;$('#showGrid').checked=sim.showGrid;$('#showTable').checked=sim.showTable;
  }
  loadToolFields();updateSummaries();compileProgram({silent:true});setDirty(false);
}
async function loadProgramFile(file){const text=await file.text();replaceEditor(text,{name:file.name,mark:false,reset:true});compileProgram({silent:true});setDirty(false);toast(`Programa ${file.name} importado`);}
async function loadProjectFile(file){try{loadProjectObject(JSON.parse(await file.text()));toast(`Proyecto ${file.name} abierto`);}catch(error){toast(`Proyecto inválido: ${error.message}`,'error');}}

function openStockDialog(){setStockForm(config.workspace);$('#stockDialog').showModal();}
function renderOffsetList(){
  $('#offsetList').innerHTML=Object.keys(offsetDraft).filter(k=>/^G5[4-9]$/.test(k)).sort().map(key=>{const o=offsetDraft[key];return `<div class="offset-item ${key===selectedOffset?'active':''}" data-offset="${key}"><strong>${key}</strong><span>X${o.x} Y${o.y} Z${o.z}</span></div>`;}).join('');
  $('#offsetEditingTitle').textContent=selectedOffset;loadOffsetInputs();
}
function saveOffsetInputs(){if(!offsetDraft)return;offsetDraft[selectedOffset]={x:+$('#offsetX').value||0,y:+$('#offsetY').value||0,z:+$('#offsetZ').value||0};}
function loadOffsetInputs(){const o=offsetDraft[selectedOffset]||{x:0,y:0,z:0};$('#offsetX').value=o.x;$('#offsetY').value=o.y;$('#offsetZ').value=o.z;}
function openOffsetDialog(){offsetDraft=deepClone(config.offsets);selectedOffset=/^G5[4-9]$/.test(interpreter.state.wcs)?interpreter.state.wcs:'G54';renderOffsetList();$('#offsetDialog').showModal();}
function applyOffsets(){saveOffsetInputs();config.offsets=offsetDraft;$('#offsetDialog').close();updateSummaries();compileProgram({silent:true});toast('Ceros de pieza actualizados');}
function populateToolPresets(unit=toolDisplayUnit,selected='custom'){
  const list=CUTTER_LIBRARY.filter(p=>p.system===unit),groups={flat:'Fresas planas',ball:'Punta bola',face:'Planeado',drill:'Brocas',chamfer:'Chaflán / avellanado'};
  let html='<option value="custom">Personalizado</option>';
  for(const [type,label] of Object.entries(groups)){
    const items=list.filter(p=>p.type===type);
    if(items.length)html+=`<optgroup label="${label}">${items.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</optgroup>`;
  }
  $('#toolPreset').innerHTML=html;
  $('#toolPreset').value=list.some(p=>p.id===selected)?selected:'custom';
}
function renderToolSlots(selected=+$('#toolNumber').value||3){
  const filter=($('#toolSearch')?.value||'').trim().toLowerCase(),numbers=Object.keys(config.tools).map(Number).sort((a,b)=>a-b);
  const rows=numbers.filter(number=>{const tool=config.tools[number];return !filter||`t${number} ${tool.name} ${TOOL_TYPES[tool.type]||tool.type} ${tool.diameter}`.toLowerCase().includes(filter);});
  $('#toolSlotList').innerHTML=rows.map(number=>{const tool=config.tools[number];return `<button type="button" class="tool-slot ${number===selected?'active':''}" data-tool-slot="${number}"><span class="tool-slot-number">T${number}</span><span class="tool-slot-glyph ${tool.type||'flat'}"></span><span class="tool-slot-copy"><strong>${escapeHtml(tool.name||TOOL_TYPES[tool.type]||'Cortador')}</strong><span>Ø${formatNumber(lengthInUnit(tool.diameter||0,tool.displayUnit||'mm'))} ${unitLabel(tool.displayUnit||'mm')} · ${TOOL_TYPES[tool.type]||tool.type}</span></span></button>`;}).join('')||'<div class="empty-state">No hay herramientas que coincidan.</div>';
}
function updateToolPreview(){
  const number=Math.max(1,Math.trunc(+$('#toolNumber').value||3)),type=$('#toolType').value,name=$('#toolName').value.trim()||TOOL_TYPES[type],diameter=+$('#toolDiameter').value||0,u=$('#toolUnit').value;
  $('#toolTitle').textContent=`T${number} · ${name}`;
  $('#toolDescription').textContent=`${TOOL_TYPES[type]} · Ø${formatNumber(diameter)} ${unitLabel(u)} · esta geometría se mostrará en la simulación 2.5D y se usará para remover material.`;
  $('#toolIcon').className=`tool-icon ${type}`;
  $('#toolAngleRow').classList.toggle('hidden-field',!['drill','chamfer'].includes(type));
  $('#toolUnitMark').textContent=`(${unitLabel(u)})`;$('#toolLengthUnitMark').textContent=`(${unitLabel(u)})`;
  const preset=CUTTER_LIBRARY.find(p=>p.id===$('#toolPreset').value);
  $('#toolPresetInfo').textContent=preset?`${preset.name}. Se asignará únicamente a T${number} al guardar.`:`T${number} está en modo personalizado; puedes cambiar tipo, nombre, diámetro, longitud y ángulo.`;
}
function setToolForm(number,tool){
  tool={diameter:10,length:70,type:'flat',name:'Fresa plana Ø10 mm',angle:90,displayUnit:'mm',presetId:'custom',...tool};
  toolDisplayUnit=tool.displayUnit==='in'?'in':'mm';
  $('#toolNumber').value=number;$('#toolUnit').value=toolDisplayUnit;populateToolPresets(toolDisplayUnit,tool.presetId);
  $('#toolType').value=tool.type;$('#toolName').value=tool.name;$('#toolDiameter').value=lengthInUnit(tool.diameter,toolDisplayUnit);$('#toolLength').value=lengthInUnit(tool.length,toolDisplayUnit);$('#toolAngle').value=tool.angle||90;
  renderToolSlots(number);updateToolPreview();
}
function loadToolFields(number=null){
  const ids=Object.keys(config.tools).map(Number).sort((a,b)=>a-b),toolNumber=number&&config.tools[number]?number:(ids.includes(3)?3:(ids[0]||3));
  if(!config.tools[toolNumber])config.tools[toolNumber]=toolFromPreset('m-flat-3')||{diameter:3,length:45,type:'flat',name:'Fresa plana Ø3 mm',angle:90,displayUnit:'mm',presetId:'m-flat-3'};
  setToolForm(toolNumber,config.tools[toolNumber]);
}
function openToolDialog(){
  const current=interpreter?.state?.tool&&config.tools[interpreter.state.tool]?interpreter.state.tool:null;
  $('#toolSearch').value='';loadToolFields(current);$('#toolDialog').showModal();
}
function applyTool(){
  const number=Math.max(1,Math.trunc(+$('#toolNumber').value||3)),u=$('#toolUnit').value,type=$('#toolType').value,diameter=Math.max(.001,lengthToMm($('#toolDiameter').value,u)),length=Math.max(0,lengthToMm($('#toolLength').value,u)),angle=Math.max(10,Math.min(180,+$('#toolAngle').value||90)),name=$('#toolName').value.trim()||`${TOOL_TYPES[type]} Ø${formatNumber($('#toolDiameter').value)} ${unitLabel(u)}`;
  config.tools[number]={diameter,length,type,name,angle,displayUnit:u,presetId:$('#toolPreset').value};
  if(interpreter?.state?.tool===number||!interpreter?.state?.tool)sim.setCurrentTool(config.tools[number]);
  renderToolSlots(number);updateSummaries();compileProgram({silent:true});toast(`T${number} guardada como ${name}`);
}
function createToolSlot(){
  const raw=prompt('Número de la nueva ranura T (1–999):','100');if(raw===null)return;
  const number=Math.max(1,Math.min(999,Math.trunc(Number(raw))));if(!Number.isFinite(number)){toast('Número T inválido','error');return;}
  if(config.tools[number]){setToolForm(number,config.tools[number]);toast(`T${number} ya existe`);return;}
  config.tools[number]=toolFromPreset('m-flat-3');setToolForm(number,config.tools[number]);toast(`Ranura T${number} creada`);
}
function deleteToolSlot(){
  const number=+$('#toolNumber').value;if(!config.tools[number])return;
  if(!confirm(`¿Eliminar la configuración de T${number}?`))return;
  delete config.tools[number];const next=Object.keys(config.tools).map(Number).sort((a,b)=>a-b)[0];if(next)setToolForm(next,config.tools[next]);else{config.tools=createDefaultToolTable();loadToolFields();}toast(`T${number} eliminada`);
}
function restoreToolTable(){
  if(!confirm('¿Restaurar la tabla educativa predeterminada? Se reemplazarán las asignaciones actuales.'))return;
  config.tools=createDefaultToolTable();loadToolFields(3);compileProgram({silent:true});updateSummaries();toast('Tabla de herramientas restaurada');
}
function showInfo(title,html){$('#infoDialogTitle').textContent=title;$('#infoDialogBody').innerHTML=html;$('#infoDialog').showModal();}
function showShortcuts(){showInfo('Atajos y controles',`<h3>Edición</h3><p><kbd>Ctrl+Z</kbd> deshacer, <kbd>Ctrl+Y</kbd> rehacer, <kbd>Ctrl+Espacio</kbd> autocompletar, <kbd>Ctrl+S</kbd> guardar NC y <kbd>Alt+Shift+F</kbd> formatear.</p><h3>Simulación</h3><p><kbd>F5</kbd> ejecutar, <kbd>F7</kbd> validar, <kbd>F10</kbd> bloque a bloque, <kbd>Ctrl+R</kbd> reiniciar y <kbd>Shift+F11</kbd> maximizar.</p><h3>Vistas</h3><p>Usa 3D para revisar maquinado y herramienta. En 2D verás el trazo superior de la trayectoria. En 3D, arrastra con el botón izquierdo para rotar; usa Shift o el botón derecho para desplazar. La rueda controla el zoom y doble clic encuadra la mesa.</p>`);}
function showAbout(){showInfo('Acerca de FANUC Forge Studio',`<h3>Simulador educativo de fresadora</h3><p>Editor y simulador local para programas estilo FANUC, subprogramas y una parte útil de Custom Macro B. Incluye vista 3D, trazo 2D, mesa con pieza posicionable y catálogo que separa claramente funciones simuladas, parciales y de referencia.</p><p>No reemplaza el dry run, single block, comprobación de offsets, límites de carrera, herramienta, sujeción ni validación en el control real.</p>`);}

function activateDock(name){$$('.dock-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.dock===name));$$('.dock-pane').forEach(pane=>pane.classList.toggle('active',pane.id===`${name}Pane`));mainArea.classList.remove('dock-collapsed');}
function toggleDock(){mainArea.classList.toggle('dock-collapsed');}
function maximizeSimulation(){appRoot.classList.toggle('sim-maximized');setTimeout(()=>sim.resize(),50);}
function setView(name){sim.setView(sim.viewMode==='2d'?'top':name);}
function setDisplayMode(mode='3d'){const next=mode==='2d'?'2d':'3d';sim.setDisplayMode(next);appRoot.classList.toggle('mode-2d',next==='2d');$$('.display-modes button').forEach(button=>button.classList.toggle('active',button.dataset.display===next));if(next==='2d'){sim.fitView('stock',false);}else{sim.setView('iso');sim.fitView('scene',false);}sim.resize();}

const actions={
  newProgram:()=>replaceEditor('',{name:'nuevo_programa.nc',mark:true,reset:true}),
  openProgram:()=>$('#programFileInput').click(),saveProgram,openProject:()=>$('#projectFileInput').click(),saveProject,saveLocal:()=>saveLocal(true),loadLocal,
  undo,redo,format:formatCode,autocomplete:()=>{editor.focus();showAutocomplete(true);},selectAll:()=>{editor.focus();editor.select();updateEditorChrome();},
  stockSetup:openStockDialog,offsetSetup:openOffsetDialog,toolSetup:openToolDialog,
  compile:()=>compileProgram(),play:playProgram,step:()=>{if(runIndex<0)compileProgram({silent:true});stepProgram();},pause:()=>{stopPlayback();setStatus('Simulación pausada');},reset:resetSimulation,
  fitView:()=>sim.fitView('scene'),fitStock:()=>sim.fitView('stock'),toggleDock,maximizeSimulation,
  showCodes:()=>activateDock('codes'),shortcuts:showShortcuts,about:showAbout
};
function runAction(name){closeMenus();actions[name]?.();}

function closeMenus(){$$('.menu').forEach(menu=>menu.classList.remove('open'));}
$$('.menu-trigger').forEach(trigger=>trigger.addEventListener('click',event=>{event.stopPropagation();const menu=trigger.closest('.menu'),wasOpen=menu.classList.contains('open');closeMenus();if(!wasOpen)menu.classList.add('open');}));
document.addEventListener('click',event=>{if(!event.target.closest('.menu'))closeMenus();const action=event.target.closest('[data-action]')?.dataset.action;if(action)runAction(action);});

editor.addEventListener('input',()=>{if(!history.locked)scheduleHistory();afterEditorChange(true);});
editor.addEventListener('scroll',()=>{lineNumbers.scrollTop=editor.scrollTop;hideAutocomplete();});
editor.addEventListener('click',updateEditorChrome);editor.addEventListener('keyup',updateEditorChrome);editor.addEventListener('select',updateEditorChrome);
editor.addEventListener('keydown',event=>{
  if(event.ctrlKey&&event.code==='Space'){event.preventDefault();showAutocomplete(true);return;}
  if(!$('#autocomplete').classList.contains('hidden')){
    const items=$$('#autocomplete .ac-item');
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();activeAc=(activeAc+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;items.forEach((item,index)=>item.classList.toggle('active',index===activeAc));items[activeAc]?.scrollIntoView({block:'nearest'});return;}
    if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();acceptAutocomplete();return;}
    if(event.key==='Escape'){hideAutocomplete();return;}
  }
  if(event.key==='Tab'){event.preventDefault();commitHistory();editor.setRangeText('  ',editor.selectionStart,editor.selectionEnd,'end');commitHistory();afterEditorChange(false);}
});
$('#autocomplete').addEventListener('mousedown',event=>{const item=event.target.closest('.ac-item');if(item){event.preventDefault();activeAc=+item.dataset.acIndex;acceptAutocomplete();}});

$$('.display-modes button').forEach(button=>button.addEventListener('click',()=>setDisplayMode(button.dataset.display)));
$$('.dock-tab').forEach(button=>button.addEventListener('click',()=>activateDock(button.dataset.dock)));
$('#speedRange').addEventListener('input',event=>$('#speedOut').textContent=`${event.target.value}×`);
$('#showRapids').addEventListener('change',event=>{sim.showRapids=event.target.checked;sim.draw();queueAutosave();});
$('#showCuts').addEventListener('change',event=>{sim.showCuts=event.target.checked;sim.draw();queueAutosave();});
$('#showGrid').addEventListener('change',event=>{sim.showGrid=event.target.checked;sim.draw();});
$('#showTable').addEventListener('change',event=>{sim.showTable=event.target.checked;sim.draw();});
$('#renderQuality').addEventListener('change',event=>{config.workspace.renderQuality=event.target.value;sim.setRenderQuality(event.target.value);sim.draw();queueAutosave();});
$('#codeFilter').addEventListener('input',renderDictionary);$('#categoryFilter').addEventListener('change',renderDictionary);$('#supportFilter').addEventListener('change',renderDictionary);$('#variableFilter').addEventListener('input',renderVariables);
$('#codeDictionary').addEventListener('click',event=>{const card=event.target.closest('.code-card');if(!card)return;const code=CODES[+card.dataset.codeIndex];insertAtCursor(code.insert||code.example);toast(`${code.code} insertado`);});
$('#addVariableBtn').addEventListener('click',()=>$('#variableDialog').showModal());
$('#confirmVariableBtn').addEventListener('click',event=>{event.preventDefault();interpreter.variables.set(+$('#dialogVarNumber').value,+$('#dialogVarValue').value);renderVariables();$('#variableDialog').close();toast('Variable asignada en la sesión');});
$('#applyStockBtn').addEventListener('click',event=>{event.preventDefault();applyStock();});
$('#offsetList').addEventListener('click',event=>{const item=event.target.closest('.offset-item');if(!item)return;saveOffsetInputs();selectedOffset=item.dataset.offset;renderOffsetList();});
$('#setZeroHereBtn').addEventListener('click',()=>{$('#offsetX').value=sim.toolPos.x;$('#offsetY').value=sim.toolPos.y;$('#offsetZ').value=sim.toolPos.z;});
$('#zeroOffsetBtn').addEventListener('click',()=>{$('#offsetX').value=0;$('#offsetY').value=0;$('#offsetZ').value=0;});
$('#applyOffsetBtn').addEventListener('click',event=>{event.preventDefault();applyOffsets();});
$('#applyToolBtn').addEventListener('click',event=>{event.preventDefault();applyTool();});
$('#toolSlotList').addEventListener('click',event=>{const slot=event.target.closest('[data-tool-slot]');if(!slot)return;const number=+slot.dataset.toolSlot;if(config.tools[number])setToolForm(number,config.tools[number]);});
$('#toolSearch').addEventListener('input',()=>renderToolSlots(+$('#toolNumber').value||3));
$('#newToolSlotBtn').addEventListener('click',createToolSlot);
$('#deleteToolSlotBtn').addEventListener('click',deleteToolSlot);
$('#restoreToolTableBtn').addEventListener('click',restoreToolTable);
$('#stockUnit').addEventListener('change',event=>{const next=event.target.value;for(const input of $$('.stock-length')){const mm=lengthToMm(input.value,stockDisplayUnit);input.value=lengthInUnit(mm,next);}stockDisplayUnit=next;refreshStockUnits();});
for(const input of $$('.stock-length, #zeroMode, #tableSlotDirection'))input.addEventListener('input',updatePiecePositionInfo);
$('#centerStockBtn').addEventListener('click',()=>{const u=$('#stockUnit').value,x=lengthToMm($('#stockX').value,u),y=lengthToMm($('#stockY').value,u),corner=$('#zeroMode').value==='corner';$('#stockPosX').value=lengthInUnit(corner?-x/2:0,u);$('#stockPosY').value=lengthInUnit(corner?-y/2:0,u);updatePiecePositionInfo();});
$('#syncG54Btn').addEventListener('click',()=>{config.offsets.G54=pieceOrigin(stockSettings());updateSummaries();toast('G54 alineado con el origen visual de la pieza');});
$('#toolUnit').addEventListener('change',event=>{const next=event.target.value,old=toolDisplayUnit;$('#toolDiameter').value=lengthInUnit(lengthToMm($('#toolDiameter').value,old),next);$('#toolLength').value=lengthInUnit(lengthToMm($('#toolLength').value,old),next);toolDisplayUnit=next;populateToolPresets(next,'custom');updateToolPreview();});
$('#toolPreset').addEventListener('change',event=>{const preset=CUTTER_LIBRARY.find(p=>p.id===event.target.value);if(preset){$('#toolType').value=preset.type;$('#toolName').value=preset.name;$('#toolDiameter').value=lengthInUnit(preset.diameter,toolDisplayUnit);$('#toolLength').value=lengthInUnit(preset.length,toolDisplayUnit);$('#toolAngle').value=preset.angle||90;}updateToolPreview();});
$('#toolNumber').addEventListener('change',event=>{const n=Math.max(1,Math.trunc(+event.target.value||3));if(config.tools[n])setToolForm(n,config.tools[n]);else updateToolPreview();});
for(const input of $$('#toolType, #toolName, #toolDiameter, #toolLength, #toolAngle'))input.addEventListener('input',()=>{$('#toolPreset').value='custom';updateToolPreview();});

$('#programFileInput').addEventListener('change',async event=>{const file=event.target.files[0];if(file)await loadProgramFile(file);event.target.value='';});
$('#projectFileInput').addEventListener('change',async event=>{const file=event.target.files[0];if(file)await loadProjectFile(file);event.target.value='';});

const dropTarget=$('#editorShell');
for(const type of ['dragenter','dragover'])dropTarget.addEventListener(type,event=>{event.preventDefault();$('#dropOverlay').classList.remove('hidden');});
for(const type of ['dragleave','drop'])dropTarget.addEventListener(type,event=>{event.preventDefault();if(type==='drop'){$('#dropOverlay').classList.add('hidden');const file=event.dataTransfer.files[0];if(file){if(/\.(ffcnc|json)$/i.test(file.name))loadProjectFile(file);else loadProgramFile(file);}}else if(!dropTarget.contains(event.relatedTarget))$('#dropOverlay').classList.add('hidden');});

const splitter=$('#mainSplitter');let splitting=false;
splitter.addEventListener('pointerdown',event=>{splitting=true;splitter.setPointerCapture(event.pointerId);splitter.classList.add('dragging');});
splitter.addEventListener('pointermove',event=>{if(!splitting)return;const rect=workbench.getBoundingClientRect(),percent=Math.max(27,Math.min(65,(event.clientX-rect.left)/rect.width*100));document.documentElement.style.setProperty('--editor-share',`${percent}%`);sim.resize();});
const stopSplit=()=>{splitting=false;splitter.classList.remove('dragging');};splitter.addEventListener('pointerup',stopSplit);splitter.addEventListener('pointercancel',stopSplit);

window.addEventListener('keydown',event=>{
  const target=event.target,editing=target===editor||target.matches?.('input,select,textarea');
  const ctrl=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();
  const formField=target!==editor&&target.matches?.('input,textarea');
  if(ctrl&&key==='z'&&!event.shiftKey){if(formField)return;event.preventDefault();undo();return;}
  if((ctrl&&key==='y')||(ctrl&&event.shiftKey&&key==='z')){if(formField)return;event.preventDefault();redo();return;}
  if(ctrl&&key==='s'){event.preventDefault();event.shiftKey?saveProject():saveProgram();return;}
  if(ctrl&&key==='o'){event.preventDefault();event.shiftKey?$('#projectFileInput').click():$('#programFileInput').click();return;}
  if(ctrl&&key==='n'){event.preventDefault();actions.newProgram();return;}
  if(ctrl&&key==='r'){event.preventDefault();resetSimulation();return;}
  if(ctrl&&key==='j'){event.preventDefault();toggleDock();return;}
  if(event.altKey&&event.shiftKey&&key==='f'){event.preventDefault();formatCode();return;}
  if(event.key==='F5'){event.preventDefault();playProgram();return;}
  if(event.key==='F7'){event.preventDefault();compileProgram();return;}
  if(event.key==='F10'){event.preventDefault();actions.step();return;}
  if(event.shiftKey&&event.key==='F11'){event.preventDefault();maximizeSimulation();return;}
  if(!editing&&key==='f'){sim.fitView();return;}
  if(event.key==='Escape'){closeMenus();hideAutocomplete();}
});
window.addEventListener('resize',()=>sim.resize());
window.addEventListener('beforeunload',event=>{saveLocal(false);if(dirty){event.preventDefault();event.returnValue='';}});

CATEGORIES.forEach(category=>$('#categoryFilter').insertAdjacentHTML('beforeend',`<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`));
editor.value='';resetHistory('');updateEditorChrome();renderDictionary();syncWorkspaceConfig(DEFAULT_WORKSPACE);setStockForm(config.workspace);loadToolFields();applyStock({compile:false,close:false,notify:false});sim.setCurrentTool(config.tools[3]);compileProgram({silent:true});setDirty(false);setDisplayMode('3d');setView('iso');updateSummaries();setStatus('Preparado');
