import{r as a,j as t}from"./vendor-react-BTrjyshy.js";import{S as y}from"./Select-Bll_pjQj.js";/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=(...s)=>s.filter((e,n,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===n).join(" ").trim();/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const N=s=>s.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const S=s=>s.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,n,r)=>r?r.toUpperCase():n.toLowerCase());/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=s=>{const e=S(s);return e.charAt(0).toUpperCase()+e.slice(1)};/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var C={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=s=>{for(const e in s)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1},_=a.createContext({}),A=()=>a.useContext(_),E=a.forwardRef(({color:s,size:e,strokeWidth:n,absoluteStrokeWidth:r,className:d="",children:i,iconNode:v,...u},w)=>{const{size:h=24,strokeWidth:m=2,absoluteStrokeWidth:c=!1,color:x="currentColor",className:l=""}=A()??{},p=r??c?Number(n??m)*24/Number(e??h):n??m;return a.createElement("svg",{ref:w,...C,width:e??h??C.width,height:e??h??C.height,stroke:s??x,strokeWidth:p,className:b("lucide",l,d),...!i&&!L(u)&&{"aria-hidden":"true"},...u},[...v.map(([o,k])=>a.createElement(o,k)),...Array.isArray(i)?i:[i]])});/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const g=(s,e)=>{const n=a.forwardRef(({className:r,...d},i)=>a.createElement(E,{ref:i,iconNode:e,className:b(`lucide-${N(j(s))}`,`lucide-${s}`,r),...d}));return n.displayName=j(s),n};/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]],$=g("chevron-left",W);/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=[["path",{d:"m9 18 6-6-6-6",key:"mthhwq"}]],R=g("chevron-right",I);/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"m11 17-5-5 5-5",key:"13zhaf"}],["path",{d:"m18 17-5-5 5-5",key:"h8a8et"}]],B=g("chevrons-left",z);/**
 * @license lucide-react v1.27.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const M=[["path",{d:"m6 17 5-5-5-5",key:"xnjwq"}],["path",{d:"m13 17 5-5-5-5",key:"17xmmf"}]],P=g("chevrons-right",M);function f({children:s,onClick:e,disabled:n,label:r}){return t.jsx("button",{onClick:e,disabled:n,"aria-label":r,className:"flex h-8 w-8 items-center justify-center rounded-full text-stone-500 transition hover:bg-white hover:text-stone-900 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none disabled:hover:text-stone-500",children:s})}function K({summary:s,pageNumber:e,totalPages:n,pageSize:r,pageSizeOptions:d,onPageSizeChange:i,onPrevious:v,onNext:u,onFirst:w,onLast:h,onGoToPage:m,disabled:c=!1}){const[x,l]=a.useState(String(e));a.useEffect(()=>{l(String(e))},[e]);const p=()=>{if(x===""){l(String(e));return}let o=Number(x);if(Number.isNaN(o)){l(String(e));return}o=Math.max(1,Math.min(o,n)),m(o)};return t.jsxs("div",{className:"flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm",children:[t.jsxs("div",{className:"flex items-center gap-3",children:[t.jsx("span",{className:"text-sm leading-tight text-slate-500",children:s}),t.jsx("div",{className:"hidden h-4 w-px bg-stone-200 sm:block"}),t.jsx("div",{className:"relative",children:t.jsx(y,{value:r,onChange:o=>i(Number(o.target.value)),disabled:c,className:"min-w-[120px]",searchable:!1,children:d.map(o=>t.jsxs("option",{value:o,children:[o," / page"]},o))})})]}),t.jsxs("div",{className:"flex items-center gap-1 rounded-full bg-stone-100 p-1",children:[t.jsx(f,{onClick:w,disabled:c||e===1,label:"First page",children:t.jsx(B,{size:16})}),t.jsx(f,{onClick:v,disabled:c||e===1,label:"Previous page",children:t.jsx($,{size:16})}),t.jsxs("div",{className:"flex items-center gap-1.5 px-1.5",children:[t.jsx("input",{type:"text",inputMode:"numeric",value:x,onChange:o=>l(o.target.value.replace(/[^0-9]/g,"")),onBlur:p,onKeyDown:o=>o.key==="Enter"&&p(),disabled:c,className:"h-8 w-9 rounded-lg bg-white text-center text-sm font-semibold text-slate-800 shadow-sm outline-none ring-1 ring-transparent transition focus:ring-2 focus:ring-amber-700 disabled:opacity-50"}),t.jsxs("span",{className:"text-sm text-slate-400",children:["of ",Math.max(1,n)]})]}),t.jsx(f,{onClick:u,disabled:c||e>=n,label:"Next page",children:t.jsx(R,{size:16})}),t.jsx(f,{onClick:h,disabled:c||e>=n,label:"Last page",children:t.jsx(P,{size:16})})]})]})}export{K as T};
