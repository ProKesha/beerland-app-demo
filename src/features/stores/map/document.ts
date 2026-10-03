import { colors, layout } from '@/theme/tokens';
import { getStoreStatus } from '../hours';
import type { StoreMapProps } from './types';

// Provider configuration stays inside this adapter. No key or location permission.
const styleUrl = 'https://tiles.openfreemap.org/styles/liberty';
const libraryUrl = 'https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl';
export function mapDocument(
  props: Pick<
    StoreMapProps,
    'stores' | 'selectedStoreId' | 'highlightedStoreId'
  >,
) {
  const data = JSON.stringify(
    props.stores.map((store) => ({
      id: store.id,
      name: store.name,
      ...store.coordinates,
      open: getStoreStatus(store).isOpen,
    })),
  ).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="uk"><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${libraryUrl}.css">
<style>
html,body,#map{height:100%;margin:0;background:${colors.background}}
.pin{width:${layout.touchTarget}px;height:${layout.touchTarget}px;background:${colors.primary};color:${colors.surface};border:2px solid ${colors.surface};border-radius:50%;font:bold 16px sans-serif;box-shadow:0 2px 5px ${colors.overlay};cursor:pointer}
.maplibregl-ctrl-group button{width:${layout.touchTarget}px;height:${layout.touchTarget}px}
.pin.selected{outline:3px solid ${colors.amber}}.pin.highlighted{border-radius:5px}.pin:focus-visible{outline:3px solid ${colors.amber}}
.maplibregl-ctrl-attrib{font-size:10px}
</style></head><body><div id="map" aria-label="Карта магазинів"></div>
<script>
var ready=false;
function send(type,id){var data=JSON.stringify({type:type,id:id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(data);else parent.postMessage(data,'*')}
window.onerror=function(){send('error')};
setTimeout(function(){if(!ready)send('error')},15000);
</script>
<script src="${libraryUrl}.js" onerror="send('error')"></script>
<script>
try {
  var stores=${data};
  var map=new maplibregl.Map({container:'map',style:'${styleUrl}',center:[30.52,50.45],zoom:11,attributionControl:false,locale:{'Map.Title':'Карта магазинів','NavigationControl.ZoomIn':'Збільшити','NavigationControl.ZoomOut':'Зменшити','AttributionControl.ToggleAttribution':'Джерела карти'}});
  map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
  map.addControl(new maplibregl.AttributionControl({compact:false}));
  map.scrollZoom.disable();
  map.on('load',function(){ready=true;send('ready')});
  map.on('error',function(){send('error')});
  map.getCanvas().addEventListener('webglcontextlost',function(){send('error')});
  var markers={};
  stores.forEach(function(store,index){
    var button=document.createElement('button');button.className='pin';button.type='button';button.textContent=store.open?String(index+1):'×';
    button.setAttribute('aria-label',store.name+(store.open?' · Відчинено':' · Зачинено'));
    button.addEventListener('click',function(){send('select',store.id)});
    markers[store.id]=button;
    new maplibregl.Marker({element:button}).setLngLat([store.longitude,store.latitude]).addTo(map);
  });
  if(stores.length){var bounds=new maplibregl.LngLatBounds();stores.forEach(function(s){bounds.extend([s.longitude,s.latitude])});map.fitBounds(bounds,{padding:50,maxZoom:14,duration:0})}
  window.updateSelection=function(selected,highlighted,statuses){stores.forEach(function(s,i){if(statuses && typeof statuses[s.id]==='boolean')s.open=statuses[s.id];var el=markers[s.id];el.classList.toggle('selected',s.id===selected);el.classList.toggle('highlighted',s.id===highlighted);el.textContent=s.id===selected?'✓':s.open?String(i+1):'×';el.setAttribute('aria-label',s.name+(s.id===selected?' · Ваш магазин':'')+(s.open?' · Відчинено':' · Зачинено'))})};
  window.addEventListener('message',function(event){if(event.source!==parent)return;try{var d=JSON.parse(event.data);if(d.type==='selection')window.updateSelection(d.selected,d.highlighted,d.statuses)}catch(e){}});
} catch(error) {send('error')}
</script></body></html>`;
}
