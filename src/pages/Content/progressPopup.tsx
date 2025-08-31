// Reference-style progress popup for friend request automation
// Use the built icon path directly
const icon128 = chrome.runtime.getURL('icon-128.png');
const FCE_CSS = `
#FCE_friend_convert_model a{  
    float: right;
    color: red;
    margin:0;
    position: absolute;
    right: 10px;
    font-size: 22px;

}
#FCE_friend_convert_model{
  position: fixed;
  top: calc(100% - 319px);
  left: 20px;
  background: #fff;
  width:250px;
  border-radius: 15px;
}
#FCE_overlay {
  position: fixed;
  display: none;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  z-index: 9999;
}
#FCE_friend_convert_model div{width:100%;}
#FCE_friend_convert_model .section{display:flex;flex-direction:column;background:white;box-shadow: 0px 10px 36px rgba(0, 0, 0, 0.130709);border-radius: 14px;font-family:Arial, Helvetica, sans-serif; height: 300px;top: 121px;}
#FCE_friend_convert_model .icon{display:flex;width:100%;text-align:center !important;padding-top:5%;}
#FCE_friend_convert_model .text{width:100%;text-align:center !important;width:100%;font-size: 13px !important;line-height: 23px;color: #000000;}
#FCE_friend_convert_model .text h3{font-size: 20px !important; padding: 0 10px !important;}
#FCE_friend_convert_model .text h2{text-align:center !important;width:100%;font-size: 26px !important;line-height: 23px;color: #333333;margin-top:50px}
#FCE_friend_convert_model .block{width:100%;font-size: 25px !important;line-height: 18px;text-align: center;color: #000000;margin-top: 13%;font-weight: bold;}
#FCE_friend_convert_model .text h4{background: #F9F9F9;border-radius: 23px;font-size: 24px !important;line-height: 28px;color: #333333;width: 20%;margin: 0 auto;text-align: center !important;height: 46px;padding-top: 17px;margin-bottom:5%;}
#FCE_friend_convert_model #text h2{margin-top:60px;font-size:16px !important;margin-bottom:3%}
#friend-convert-msgs{
  padding-bottom: 20px;
}
#friend-convert-msgs span{
  font-weight:600;
  font-size:14px;
}
#FCE_friend_convert_model img{
  width: 65px !important;
  margin: 0 auto !important;
}
.FCE-added{
  background-color: red !important;
}
.yes-friend-btn{
    border: 3px solid green; 
}
    #FCE_status {
    padding: 10px;
    }
    #FCE_total {
    position:relative;
    top: 10px;
    }
`;

function injectFCECSS() {
  if (!document.getElementById('FCE_friend_convert_css')) {
    const style = document.createElement('style');
    style.id = 'FCE_friend_convert_css';
    style.textContent = FCE_CSS;
    document.head.appendChild(style);
  }
}

function mountProgressPopup() {
  injectFCECSS();
  let container = document.getElementById('FCE_friend_convert_model');
  if (!container) {
    container = document.createElement('div');
    container.id = 'FCE_friend_convert_model';
    container.innerHTML = `
      <div class="section">
        <div class="icon">
          <img id="FCE_progress_icon" alt="progress" />
        </div>
        <div class="text">
          <h2><span id="FCE_sent">0</span> / Limit: <span id="FCE_limit">0</span></h2>
          <div id="FCE_scanning">Scanning keyword...</div>
          <div id="FCE_paused" style="display:none;color:#ff9800;font-weight:600;">Paused</div>
        </div>
        <div id="friend-convert-msgs"></div>
      </div>
    `;
    // Set the image src after innerHTML assignment
    const imgElem = container.querySelector(
      '#FCE_progress_icon'
    ) as HTMLImageElement | null;
    if (imgElem) imgElem.src = icon128;
    document.body.appendChild(container);
    (
      container.querySelector('#FCE_close_btn') as HTMLAnchorElement | null
    )?.addEventListener('click', (e) => {
      e.preventDefault();
      container?.remove();
    });
  }
}

function updateProgressPopup(
  data: Partial<{
    status: string;
    sent: number;
    limit: number;
    scanning: boolean;
    totalMembers: number;
    paused: boolean;
    msg?: string;
  }>
) {
  const c = document.getElementById('FCE_friend_convert_model');
  if (!c) return;
  if (data.status !== undefined)
    if (data.sent !== undefined)
      // c.querySelector('#FCE_status')!.textContent = data.status;
      c.querySelector('#FCE_sent')!.textContent = String(data.sent);
  if (data.limit !== undefined)
    c.querySelector('#FCE_limit')!.textContent = String(data.limit);
  if (data.scanning !== undefined) {
    const scanElem = c.querySelector('#FCE_scanning') as HTMLElement | null;
    if (scanElem) scanElem.style.display = data.scanning ? '' : 'none';
  }
  if (data.paused !== undefined) {
    const pauseElem = c.querySelector('#FCE_paused') as HTMLElement | null;
    if (pauseElem) pauseElem.style.display = data.paused ? '' : 'none';
  }
  // if (data.totalMembers !== undefined)
  //   c.querySelector('#FCE_total')!.textContent = String(data.totalMembers);
  if (data.msg) {
    const msgs = c.querySelector('#friend-convert-msgs');
    if (msgs) {
      const span = document.createElement('span');
      span.textContent = data.msg;
      msgs.appendChild(span);
      msgs.appendChild(document.createElement('br'));
    }
  }
}

function removeProgressPopup() {
  const c = document.getElementById('FCE_friend_convert_model');
  if (c) c.remove();
}

(window as any).mountProgressPopup = mountProgressPopup;
(window as any).updateFriendProgress = updateProgressPopup;
(window as any).removeFriendProgressPopup = removeProgressPopup;

export {};
