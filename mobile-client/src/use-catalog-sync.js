import {onShow,onHide,onUnload} from '@dcloudio/uni-app';
import {isBackend} from './store.js';

// Only the visible page polls. Page transitions and native app suspension stop it.
export function useCatalogSync(refresh) {
  let visible=false,busy=false,timer=null;
  const sync=async()=>{
    if(!visible||busy)return;
    busy=true;
    try{await refresh();}finally{busy=false;}
  };
  const stop=()=>{visible=false;if(timer)clearInterval(timer);timer=null;};
  onShow(()=>{stop();visible=true;sync();if(isBackend)timer=setInterval(sync,5000);});
  onHide(stop);onUnload(stop);
}
