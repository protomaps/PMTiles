var Ze=s=>{throw TypeError(s)};var Se=(s,e,t)=>e.has(s)||Ze("Cannot "+t);var j=(s,e,t)=>(Se(s,e,"read from private field"),t?t.call(s):e.get(s)),Y=(s,e,t)=>e.has(s)?Ze("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(s):e.set(s,t),ge=(s,e,t,i)=>(Se(s,e,"write to private field"),i?i.call(s,t):e.set(s,t),t),me=(s,e,t)=>(Se(s,e,"access private method"),t);import{r as ct,d as xt,c as T,p as qe,a as Je,b as C,t as At,e as V,S as ht,E as wt,F as St,f as Et,g as Pt,o as Ct,h as be,i as E,j as ee,k as B,l as Tt,m as kt,s as Mt,n as Ut,u as We}from"./Frame-DJ4KX4uo.js";import{m as L,R as Lt,C as Ot,S as Rt}from"./index-C1v7Kok2.js";import{L as Nt,F as Ft}from"./LayersPanel-YWuo9clD.js";/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ye=globalThis,Oe=ye.ShadowRoot&&(ye.ShadyCSS===void 0||ye.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Re=Symbol(),Ke=new WeakMap;let dt=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==Re)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(Oe&&e===void 0){const i=t!==void 0&&t.length===1;i&&(e=Ke.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&Ke.set(t,e))}return e}toString(){return this.cssText}};const Ht=s=>new dt(typeof s=="string"?s:s+"",void 0,Re),It=(s,...e)=>{const t=s.length===1?s[0]:e.reduce((i,r,o)=>i+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+s[o+1],s[0]);return new dt(t,s,Re)},zt=(s,e)=>{if(Oe)s.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const t of e){const i=document.createElement("style"),r=ye.litNonce;r!==void 0&&i.setAttribute("nonce",r),i.textContent=t.cssText,s.appendChild(i)}},Ge=Oe?s=>s:s=>s instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return Ht(t)})(s):s;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:jt,defineProperty:Bt,getOwnPropertyDescriptor:Dt,getOwnPropertyNames:Vt,getOwnPropertySymbols:Zt,getPrototypeOf:qt}=Object,U=globalThis,Xe=U.trustedTypes,Jt=Xe?Xe.emptyScript:"",Ee=U.reactiveElementPolyfillSupport,se=(s,e)=>s,ve={toAttribute(s,e){switch(e){case Boolean:s=s?Jt:null;break;case Object:case Array:s=s==null?s:JSON.stringify(s)}return s},fromAttribute(s,e){let t=s;switch(e){case Boolean:t=s!==null;break;case Number:t=s===null?null:Number(s);break;case Object:case Array:try{t=JSON.parse(s)}catch{t=null}}return t}},Ne=(s,e)=>!jt(s,e),Ye={attribute:!0,type:String,converter:ve,reflect:!1,hasChanged:Ne};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),U.litPropertyMetadata??(U.litPropertyMetadata=new WeakMap);class Z extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Ye){if(t.state&&(t.attribute=!1),this._$Ei(),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),r=this.getPropertyDescriptor(e,i,t);r!==void 0&&Bt(this.prototype,e,r)}}static getPropertyDescriptor(e,t,i){const{get:r,set:o}=Dt(this.prototype,e)??{get(){return this[t]},set(n){this[t]=n}};return{get(){return r==null?void 0:r.call(this)},set(n){const l=r==null?void 0:r.call(this);o.call(this,n),this.requestUpdate(e,l,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Ye}static _$Ei(){if(this.hasOwnProperty(se("elementProperties")))return;const e=qt(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(se("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(se("properties"))){const t=this.properties,i=[...Vt(t),...Zt(t)];for(const r of i)this.createProperty(r,t[r])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[i,r]of t)this.elementProperties.set(i,r)}this._$Eh=new Map;for(const[t,i]of this.elementProperties){const r=this._$Eu(t,i);r!==void 0&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const r of i)t.unshift(Ge(r))}else e!==void 0&&t.push(Ge(e));return t}static _$Eu(e,t){const i=t.attribute;return i===!1?void 0:typeof i=="string"?i:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(t=>t(this))}addController(e){var t;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((t=e.hostConnected)==null||t.call(e))}removeController(e){var t;(t=this._$EO)==null||t.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return zt(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(t=>{var i;return(i=t.hostConnected)==null?void 0:i.call(t)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(t=>{var i;return(i=t.hostDisconnected)==null?void 0:i.call(t)})}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$EC(e,t){var o;const i=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,i);if(r!==void 0&&i.reflect===!0){const n=(((o=i.converter)==null?void 0:o.toAttribute)!==void 0?i.converter:ve).toAttribute(t,i.type);this._$Em=e,n==null?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(e,t){var o;const i=this.constructor,r=i._$Eh.get(e);if(r!==void 0&&this._$Em!==r){const n=i.getPropertyOptions(r),l=typeof n.converter=="function"?{fromAttribute:n.converter}:((o=n.converter)==null?void 0:o.fromAttribute)!==void 0?n.converter:ve;this._$Em=r,this[r]=l.fromAttribute(t,n.type),this._$Em=null}}requestUpdate(e,t,i){if(e!==void 0){if(i??(i=this.constructor.getPropertyOptions(e)),!(i.hasChanged??Ne)(this[e],t))return;this.P(e,t,i)}this.isUpdatePending===!1&&(this._$ES=this._$ET())}P(e,t,i){this._$AL.has(e)||this._$AL.set(e,t),i.reflect===!0&&this._$Em!==e&&(this._$Ej??(this._$Ej=new Set)).add(e)}async _$ET(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var i;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[o,n]of this._$Ep)this[o]=n;this._$Ep=void 0}const r=this.constructor.elementProperties;if(r.size>0)for(const[o,n]of r)n.wrapped!==!0||this._$AL.has(o)||this[o]===void 0||this.P(o,this[o],n)}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),(i=this._$EO)==null||i.forEach(r=>{var o;return(o=r.hostUpdate)==null?void 0:o.call(r)}),this.update(t)):this._$EU()}catch(r){throw e=!1,this._$EU(),r}e&&this._$AE(t)}willUpdate(e){}_$AE(e){var t;(t=this._$EO)==null||t.forEach(i=>{var r;return(r=i.hostUpdated)==null?void 0:r.call(i)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EU(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Ej&&(this._$Ej=this._$Ej.forEach(t=>this._$EC(t,this[t]))),this._$EU()}updated(e){}firstUpdated(e){}}Z.elementStyles=[],Z.shadowRootOptions={mode:"open"},Z[se("elementProperties")]=new Map,Z[se("finalized")]=new Map,Ee==null||Ee({ReactiveElement:Z}),(U.reactiveElementVersions??(U.reactiveElementVersions=[])).push("2.0.4");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ie=globalThis,_e=ie.trustedTypes,Qe=_e?_e.createPolicy("lit-html",{createHTML:s=>s}):void 0,ut="$lit$",M=`lit$${Math.random().toFixed(9).slice(2)}$`,pt="?"+M,Wt=`<${pt}>`,N=document,oe=()=>N.createComment(""),ne=s=>s===null||typeof s!="object"&&typeof s!="function",Fe=Array.isArray,Kt=s=>Fe(s)||typeof(s==null?void 0:s[Symbol.iterator])=="function",Pe=`[ 	
\f\r]`,Q=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,et=/-->/g,tt=/>/g,O=RegExp(`>|${Pe}(?:([^\\s"'>=/]+)(${Pe}*=${Pe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),st=/'/g,it=/"/g,ft=/^(?:script|style|textarea|title)$/i,Gt=s=>(e,...t)=>({_$litType$:s,strings:e,values:t}),D=Gt(1),F=Symbol.for("lit-noChange"),m=Symbol.for("lit-nothing"),rt=new WeakMap,R=N.createTreeWalker(N,129);function gt(s,e){if(!Fe(s)||!s.hasOwnProperty("raw"))throw Error("invalid template strings array");return Qe!==void 0?Qe.createHTML(e):e}const Xt=(s,e)=>{const t=s.length-1,i=[];let r,o=e===2?"<svg>":e===3?"<math>":"",n=Q;for(let l=0;l<t;l++){const a=s[l];let p,d,h=-1,f=0;for(;f<a.length&&(n.lastIndex=f,d=n.exec(a),d!==null);)f=n.lastIndex,n===Q?d[1]==="!--"?n=et:d[1]!==void 0?n=tt:d[2]!==void 0?(ft.test(d[2])&&(r=RegExp("</"+d[2],"g")),n=O):d[3]!==void 0&&(n=O):n===O?d[0]===">"?(n=r??Q,h=-1):d[1]===void 0?h=-2:(h=n.lastIndex-d[2].length,p=d[1],n=d[3]===void 0?O:d[3]==='"'?it:st):n===it||n===st?n=O:n===et||n===tt?n=Q:(n=O,r=void 0);const $=n===O&&s[l+1].startsWith("/>")?" ":"";o+=n===Q?a+Wt:h>=0?(i.push(p),a.slice(0,h)+ut+a.slice(h)+M+$):a+M+(h===-2?l:$)}return[gt(s,o+(s[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),i]};class ae{constructor({strings:e,_$litType$:t},i){let r;this.parts=[];let o=0,n=0;const l=e.length-1,a=this.parts,[p,d]=Xt(e,t);if(this.el=ae.createElement(p,i),R.currentNode=this.el.content,t===2||t===3){const h=this.el.content.firstChild;h.replaceWith(...h.childNodes)}for(;(r=R.nextNode())!==null&&a.length<l;){if(r.nodeType===1){if(r.hasAttributes())for(const h of r.getAttributeNames())if(h.endsWith(ut)){const f=d[n++],$=r.getAttribute(h).split(M),x=/([.?@])?(.*)/.exec(f);a.push({type:1,index:o,name:x[2],strings:$,ctor:x[1]==="."?Qt:x[1]==="?"?es:x[1]==="@"?ts:xe}),r.removeAttribute(h)}else h.startsWith(M)&&(a.push({type:6,index:o}),r.removeAttribute(h));if(ft.test(r.tagName)){const h=r.textContent.split(M),f=h.length-1;if(f>0){r.textContent=_e?_e.emptyScript:"";for(let $=0;$<f;$++)r.append(h[$],oe()),R.nextNode(),a.push({type:2,index:++o});r.append(h[f],oe())}}}else if(r.nodeType===8)if(r.data===pt)a.push({type:2,index:o});else{let h=-1;for(;(h=r.data.indexOf(M,h+1))!==-1;)a.push({type:7,index:o}),h+=M.length-1}o++}}static createElement(e,t){const i=N.createElement("template");return i.innerHTML=e,i}}function K(s,e,t=s,i){var n,l;if(e===F)return e;let r=i!==void 0?(n=t._$Co)==null?void 0:n[i]:t._$Cl;const o=ne(e)?void 0:e._$litDirective$;return(r==null?void 0:r.constructor)!==o&&((l=r==null?void 0:r._$AO)==null||l.call(r,!1),o===void 0?r=void 0:(r=new o(s),r._$AT(s,t,i)),i!==void 0?(t._$Co??(t._$Co=[]))[i]=r:t._$Cl=r),r!==void 0&&(e=K(s,r._$AS(s,e.values),r,i)),e}class Yt{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,r=((e==null?void 0:e.creationScope)??N).importNode(t,!0);R.currentNode=r;let o=R.nextNode(),n=0,l=0,a=i[0];for(;a!==void 0;){if(n===a.index){let p;a.type===2?p=new ce(o,o.nextSibling,this,e):a.type===1?p=new a.ctor(o,a.name,a.strings,this,e):a.type===6&&(p=new ss(o,this,e)),this._$AV.push(p),a=i[++l]}n!==(a==null?void 0:a.index)&&(o=R.nextNode(),n++)}return R.currentNode=N,r}p(e){let t=0;for(const i of this._$AV)i!==void 0&&(i.strings!==void 0?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class ce{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,t,i,r){this.type=2,this._$AH=m,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=r,this._$Cv=(r==null?void 0:r.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=K(this,e,t),ne(e)?e===m||e==null||e===""?(this._$AH!==m&&this._$AR(),this._$AH=m):e!==this._$AH&&e!==F&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Kt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==m&&ne(this._$AH)?this._$AA.nextSibling.data=e:this.T(N.createTextNode(e)),this._$AH=e}$(e){var o;const{values:t,_$litType$:i}=e,r=typeof i=="number"?this._$AC(e):(i.el===void 0&&(i.el=ae.createElement(gt(i.h,i.h[0]),this.options)),i);if(((o=this._$AH)==null?void 0:o._$AD)===r)this._$AH.p(t);else{const n=new Yt(r,this),l=n.u(this.options);n.p(t),this.T(l),this._$AH=n}}_$AC(e){let t=rt.get(e.strings);return t===void 0&&rt.set(e.strings,t=new ae(e)),t}k(e){Fe(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,r=0;for(const o of e)r===t.length?t.push(i=new ce(this.O(oe()),this.O(oe()),this,this.options)):i=t[r],i._$AI(o),r++;r<t.length&&(this._$AR(i&&i._$AB.nextSibling,r),t.length=r)}_$AR(e=this._$AA.nextSibling,t){var i;for((i=this._$AP)==null?void 0:i.call(this,!1,!0,t);e&&e!==this._$AB;){const r=e.nextSibling;e.remove(),e=r}}setConnected(e){var t;this._$AM===void 0&&(this._$Cv=e,(t=this._$AP)==null||t.call(this,e))}}class xe{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,r,o){this.type=1,this._$AH=m,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=o,i.length>2||i[0]!==""||i[1]!==""?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=m}_$AI(e,t=this,i,r){const o=this.strings;let n=!1;if(o===void 0)e=K(this,e,t,0),n=!ne(e)||e!==this._$AH&&e!==F,n&&(this._$AH=e);else{const l=e;let a,p;for(e=o[0],a=0;a<o.length-1;a++)p=K(this,l[i+a],t,a),p===F&&(p=this._$AH[a]),n||(n=!ne(p)||p!==this._$AH[a]),p===m?e=m:e!==m&&(e+=(p??"")+o[a+1]),this._$AH[a]=p}n&&!r&&this.j(e)}j(e){e===m?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class Qt extends xe{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===m?void 0:e}}class es extends xe{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==m)}}class ts extends xe{constructor(e,t,i,r,o){super(e,t,i,r,o),this.type=5}_$AI(e,t=this){if((e=K(this,e,t,0)??m)===F)return;const i=this._$AH,r=e===m&&i!==m||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,o=e!==m&&(i===m||r);r&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t;typeof this._$AH=="function"?this._$AH.call(((t=this.options)==null?void 0:t.host)??this.element,e):this._$AH.handleEvent(e)}}class ss{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){K(this,e)}}const Ce=ie.litHtmlPolyfillSupport;Ce==null||Ce(ae,ce),(ie.litHtmlVersions??(ie.litHtmlVersions=[])).push("3.2.1");const is=(s,e,t)=>{const i=(t==null?void 0:t.renderBefore)??e;let r=i._$litPart$;if(r===void 0){const o=(t==null?void 0:t.renderBefore)??null;i._$litPart$=r=new ce(e.insertBefore(oe(),o),o,void 0,t??{})}return r._$AI(s),r};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let re=class extends Z{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var t;const e=super.createRenderRoot();return(t=this.renderOptions).renderBefore??(t.renderBefore=e.firstChild),e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=is(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return F}};var lt;re._$litElement$=!0,re.finalized=!0,(lt=globalThis.litElementHydrateSupport)==null||lt.call(globalThis,{LitElement:re});const Te=globalThis.litElementPolyfillSupport;Te==null||Te({LitElement:re});(globalThis.litElementVersions??(globalThis.litElementVersions=[])).push("4.1.1");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const rs={attribute:!0,type:String,converter:ve,reflect:!1,hasChanged:Ne},os=(s=rs,e,t)=>{const{kind:i,metadata:r}=t;let o=globalThis.litPropertyMetadata.get(r);if(o===void 0&&globalThis.litPropertyMetadata.set(r,o=new Map),o.set(t.name,s),i==="accessor"){const{name:n}=t;return{set(l){const a=e.get.call(this);e.set.call(this,l),this.requestUpdate(n,a,s)},init(l){return l!==void 0&&this.P(n,void 0,s),l}}}if(i==="setter"){const{name:n}=t;return function(l){const a=this[n];e.call(this,l),this.requestUpdate(n,a,s)}}throw Error("Unsupported decorator location: "+i)};function mt(s){return(e,t)=>typeof t=="object"?os(s,e,t):((i,r,o)=>{const n=r.hasOwnProperty(o);return r.constructor.createProperty(o,n?{...i,wrapped:!0}:i),n?Object.getOwnPropertyDescriptor(r,o):void 0})(s,e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function $t(s){return mt({...s,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ns=(s,e,t)=>(t.configurable=!0,t.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(s,e,t),t);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let as;function ls(s){return(e,t)=>ns(e,t,{get(){return(this.renderRoot??as??(as=document.createDocumentFragment())).querySelectorAll(s)}})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const cs={ATTRIBUTE:1},hs=s=>(...e)=>({_$litDirective$:s,values:e});class ds{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}}/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const us=hs(class extends ds{constructor(s){var e;if(super(s),s.type!==cs.ATTRIBUTE||s.name!=="class"||((e=s.strings)==null?void 0:e.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(s){return" "+Object.keys(s).filter(e=>s[e]).join(" ")+" "}update(s,[e]){var i,r;if(this.st===void 0){this.st=new Set,s.strings!==void 0&&(this.nt=new Set(s.strings.join(" ").split(/\s/).filter(o=>o!=="")));for(const o in e)e[o]&&!((i=this.nt)!=null&&i.has(o))&&this.st.add(o);return this.render(e)}const t=s.element.classList;for(const o of this.st)o in e||(t.remove(o),this.st.delete(o));for(const o in e){const n=!!e[o];n===this.st.has(o)||(r=this.nt)!=null&&r.has(o)||(n?(t.add(o),this.st.add(o)):(t.remove(o),this.st.delete(o)))}return F}});/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function*ps(s,e){if(s!==void 0){let t=0;for(const i of s)yield e(i,t++)}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ke(s,e,t){return s?e(s):t==null?void 0:t(s)}var fs=Object.defineProperty,Ae=(s,e,t,i)=>{for(var r=void 0,o=s.length-1,n;o>=0;o--)(n=s[o])&&(r=n(e,t,r)||r);return r&&fs(e,t,r),r};function gs(s){return s instanceof RegExp}function Me(s){return s===null?"null":Array.isArray(s)?"array":s.constructor.name.toLowerCase()}function te(s){return s!==Object(s)}function ms(s,{nodeCount:e=3,maxLength:t=15}={}){const i=Array.isArray(s),r=Object.keys(s),o=r.slice(0,e),n=[],l=d=>{switch(Me(d)){case"object":return Object.keys(d).length===0?"{ }":"{ ... }";case"array":return d.length===0?"[ ]":"[ ... ]";case"string":return`"${d.substring(0,t)}${d.length>t?"...":""}"`;default:return String(d)}},a=[];for(const d of o){const h=[],f=s[d];i||h.push(`${d}: `),h.push(l(f)),a.push(h.join(""))}r.length>e&&a.push("..."),n.push(a.join(", "));const p=n.join("");return i?`[ ${p} ]`:`{ ${p} }`}function*He(s){const e=[[s,"",[]]];for(;e.length;){const[t,i,r]=e.shift();if(i&&(yield[t,i,r]),!te(t))for(const[o,n]of Object.entries(t))e.push([n,`${i}${i?".":""}${o}`,[...r,i]])}}function $s(s,e){const t=s.split("."),i=e.split("."),r=a=>a==="*",o=a=>a==="**";let n=0,l=0;for(;n<t.length;){const a=i[l],p=t[n];if(a===p||r(a))l++,n++;else if(o(a))l++,n=t.length-(i.length-l);else return!1}return l===i.length}var ys={fromAttribute:s=>s&&s.trim()?JSON.parse(s):void 0,toAttribute:s=>JSON.stringify(s)},Ue=s=>s!==void 0,yt=(s,e)=>gs(e)?!!s.match(e):$s(s,e),vs=(s,e)=>e.split(".").reduce((t,i)=>t[i],s),ot=(s,e)=>t=>({expanded:{...t.expanded,[s]:Ue(e)?!!e:!t.expanded[s]}}),$e=(s,e)=>(t,i)=>{const r={};if(s)for(const[,o,n]of He(i.data))yt(o,s)&&(r[o]=e,n.forEach(l=>r[l]=e));return{expanded:r}},_s=s=>(e,t)=>{const i={};if(s)for(const[,r,o]of He(t.data))yt(r,s)?(i[r]=!1,o.forEach(n=>i[n]=!1)):i[r]=!0;return{filtered:i}},bs=()=>()=>({filtered:{}}),nt=s=>()=>({highlight:s}),xs=It`
    :where(:host) {
        --background-color: #2a2f3a;
        --color: #f8f8f2;
        --string-color: #a3eea0;
        --number-color: #d19a66;
        --boolean-color: #4ba7ef;
        --null-color: #df9cf3;
        --property-color: #6fb3d2;
        --preview-color: rgba(222, 175, 143, 0.9);
        --highlight-color:  #c92a2a;
        --outline-color: #e0e4e5;
        --outline-width: 1px;
        --outline-style: dotted;

        --font-family: Nimbus Mono PS, Courier New, monospace;
        --font-size: 1rem;
        --line-height: 1.2rem;

        --indent-size: 0.5rem;
        --indentguide-size: 1px;
        --indentguide-style: solid;
        --indentguide-color: #495057;
        --indentguide-color-active: #ced4da;
        --indentguide: var(--indentguide-size) var(--indentguide-style) var(--indentguide-color);
        --indentguide-active: var(--indentguide-size) var(--indentguide-style) var(--indentguide-color-active);
    }

    :host {
        display: block;
        background-color: var(--background-color);
        color: var(--color);
        font-family: var(--font-family);
        font-size: var(--font-size);
        line-height: var(--line-height);
    }

    :focus {
        outline-color: var(--outline-color);
        outline-width: var(--outline-width);
        outline-style: var(--outline-style);
    }

    .preview {
        color: var(--preview-color);
    }

    .null {
        color: var(--null-color);
    }

    .key {
        color: var(--property-color);
        display: inline-flex;
        align-items: flex-start;
    }

    .collapsable::before {
        display: inline-flex;
        font-size: 0.8em;
        content: '▶';
        width: var(--line-height);
        height: var(--line-height);
        align-items: center;
        justify-content: center;

        transition: transform 195ms ease-out;
        transform: rotate(90deg);

        color: inherit;
    }

    .collapsable--collapsed::before {
        transform: rotate(0);
    }

    .collapsable {
        cursor: pointer;
        user-select: none;
    }

    .string {
        color: var(--string-color);
    }

    .number {
        color: var(--number-color);
    }

    .boolean {
        color: var(--boolean-color);
    }

    ul {
        padding: 0;
        clear: both;
    }

    ul,
    li {
        list-style: none;
        position: relative;
    }

    li ul > li {
        position: relative;
        margin-left: calc(var(--indent-size) + var(--line-height));
        padding-left: 0px;
    }

    ul ul::before {
        content: '';
        border-left: var(--indentguide);
        position: absolute;
        left: calc(var(--line-height) / 2 - var(--indentguide-size));
        top: 0.2rem;
        bottom: 0.2rem;
    }

    ul ul:hover::before {
        border-left: var(--indentguide-active);
    }

    mark {
        background-color: var(--highlight-color);
    }
`,le,q,J,H,vt,Le,W,he=(W=class extends re{constructor(){super();Y(this,H);Y(this,le);Y(this,q);Y(this,J);this.state={expanded:{},filtered:{},highlight:null},this.lastFocusedItem=null,ge(this,le,t=>i=>{i.preventDefault(),this.setState(ot(t))}),ge(this,q,t=>{const i=t.target;t.target===this&&me(this,H,Le).call(this,this.lastFocusedItem||this.nodeElements[0]),i.matches('[role="treeitem"]')&&(this.lastFocusedItem&&(this.lastFocusedItem.tabIndex=-1),this.lastFocusedItem=i,this.tabIndex=-1,i.tabIndex=0)}),ge(this,J,t=>{const i=t.relatedTarget;(!i||!this.contains(i))&&(this.tabIndex=0)}),this.addEventListener("focusin",j(this,q)),this.addEventListener("focusout",j(this,J))}static customRenderer(t,i){return JSON.stringify(t)}async setState(t){const i=this.state;this.state={...i,...t(i,this)}}connectedCallback(){!this.hasAttribute("data")&&!Ue(this.data)&&this.setAttribute("data",this.innerText),this.setAttribute("role","node"),this.setAttribute("tabindex","0"),super.connectedCallback()}expand(t){this.setState($e(t,!0))}expandAll(){this.setState($e("**",!0))}collapseAll(){this.setState($e("**",!1))}collapse(t){this.setState($e(t,!1))}*search(t){for(const[i,r]of He(this.data))te(i)&&String(i).match(t)&&(this.expand(r),this.updateComplete.then(()=>{const o=this.shadowRoot.querySelector(`[data-path="${r}"]`);o.scrollIntoView({behavior:"smooth",inline:"center",block:"center"}),o.focus()}),this.setState(nt(r)),yield{value:i,path:r});this.setState(nt(null))}filter(t){this.setState(_s(t))}resetFilter(){this.setState(bs())}renderObject(t,i){return D`
            <ul part="object" role="group">
                ${ps(Object.entries(t),([r,o])=>{const n=i?`${i}.${r}`:r,l=te(o),a=this.state.expanded[n];return this.state.filtered[n]?m:D`
                              <li
                                  part="property"
                                  role="treeitem"
                                  data-path="${n}"
                                  aria-expanded="${a?"true":"false"}"
                                  tabindex="-1"
                                  .hidden="${this.state.filtered[n]}"
                                  aria-hidden="${this.state.filtered[n]}"
                              >
                                  <span
                                      part="key"
                                      class="${us({key:r,collapsable:!l,"collapsable--collapsed":!this.state.expanded[n]})}"
                                      @click="${l?null:j(this,le).call(this,n)}"
                                  >
                                      ${r}:
                                      ${ke(!l&&!a,()=>this.renderNodePreview(o))}
                                  </span>

                                  ${ke(l||a,()=>this.renderValue(o,n))}
                              </li>
                          `})}
            </ul>
        `}renderValue(t,i=""){return te(t)?this.renderPrimitive(t,i):this.renderObject(t,i)}renderNodePreview(t){return D`<span part="preview" class="preview"> ${ms(t)} </span>`}renderPrimitive(t,i){const r=this.state.highlight,o=Me(t),n=this.constructor.customRenderer(t,i),l=D`
            <span part="primitive primitive-${o}" class="${Me(t)}"> ${n} </span>
        `;return i===r?D`<mark part="highlight">${l}</mark>`:l}render(){const t=this.data;return D`
            <div
                part="base"
                @keydown=${me(this,H,vt)}
                @focusin="${j(this,q)}"
                @focusout="${j(this,J)}"
            >
                ${ke(Ue(t),()=>this.renderValue(t))}
            </div>
        `}},le=new WeakMap,q=new WeakMap,J=new WeakMap,H=new WeakSet,vt=function(t){if(!["ArrowDown","ArrowUp","ArrowRight","ArrowLeft","Home","End"].includes(t.key))return;const i=[...this.nodeElements],r=this.matches(":dir(ltr)"),o=this.matches(":dir(rtl)");if(i.length>0){t.preventDefault();const n=i.findIndex(f=>f.matches(":focus")),l=i[n],a=this.state.expanded[l.dataset.path],p=te(vs(this.data,l.dataset.path)),d=f=>{const $=i[Math.max(Math.min(f,i.length-1),0)];me(this,H,Le).call(this,$)},h=f=>{this.setState(ot(l.dataset.path,f))};t.key==="ArrowDown"?d(n+1):t.key==="ArrowUp"?d(n-1):r&&t.key==="ArrowRight"||o&&t.key==="ArrowLeft"?!l||a||p?d(n+1):h(!0):r&&t.key==="ArrowLeft"||o&&t.key==="ArrowRight"?!l||!a||p?d(n-1):h(!1):t.key==="Home"?d(0):t.key==="End"&&d(i.length-1)}},Le=function(t){t.focus()},W.styles=[xs],W);Ae([mt({converter:ys,type:Object})],he.prototype,"data");Ae([$t()],he.prototype,"state");Ae([$t()],he.prototype,"lastFocusedItem");Ae([ls('[role="treeitem"]')],he.prototype,"nodeElements");customElements.define("json-viewer",he);var As=be('<div><a class="block text-xs btn-primary mt-2 text-center px-2"target=_blank rel=noreferrer>Tile <!>/<!>/</a><div class="text-xs text-center mt-2 font-mono">,'),ws=be('<div class="md:w-1/2 z-[999] app-bg">'),Ss=be('<div class="flex flex-col md:flex-row w-full h-full"><div class="flex-1 flex flex-col"><div class="flex-none p-4 flex justify-between text-xs md:text-base space-x-2"><button class="px-4 btn-primary cursor-pointer"type=button>fit to bounds</button><span class="app-border rounded px-2 flex items-center"><input class="mr-1 cursor-pointer"id=inspectFeatures type=checkbox><label for=inspectFeatures class=cursor-pointer>Inspect features</label></span><span class="app-border rounded px-2 flex items-center"><input class="mr-1 cursor-pointer"id=showTileBoundaries type=checkbox><label class=cursor-pointer for=showTileBoundaries>Show tile bounds</label></span><button class="px-4 py-1 btn-secondary cursor-pointer"type=button>view metadata</button></div><div class="relative flex-1 h-full"><div class="h-full flex-1 bg-gray-900"></div><div class=hidden></div><div class="absolute right-2 top-2 z-0"></div><div class="absolute left-3 top-28"><button type=button class="flex items-center rounded app-border cursor-pointer"><span class="app-well px-1 rounded-l">Z</span><span class="px-2 text-base text-white rounded-r-md rounded-r">'),Es=be("<json-viewer>",!0,!1);function Ps(s){let e,t;const[i,r]=C(0),[o,n]=C([]),[l,a]=C([]),[p,d]=C(!1),[h,f]=C(!1),$=Et(()=>l().map(c=>({layerName:c.sourceLayer||"unknown",id:c.id?c.id:void 0,properties:c.properties,type:c._vectorTileFeature.type}))),x=new L.Popup({closeButton:!1,closeOnClick:!1,maxWidth:"none"}),Ie=new Pt({metadata:!0});L.addProtocol("pmtiles",Ie.tile);let u,ze=!0;const _t=()=>{u.zoomTo(Math.round(u.getZoom()))},je=async()=>{const c=await s.tileset().getBounds();u.fitBounds([[c[0],c[1]],[c[2],c[3]]],{animate:!1})},bt=()=>{for(const c of u.getStyle().layers)"source"in c&&c.source==="tileset"&&u.removeLayer(c.id);"tileset"in u.getStyle().sources&&u.removeSource("tileset")},Be=async c=>{const g=c.archiveForProtocol();g&&Ie.add(g);let A=.2,v=.4;if(await c.isOverlay()&&(d(!0),A=.6,v=.8),await c.isVector()){u.addSource("tileset",{type:"vector",url:c.getMaplibreSourceUrl()});const w=await c.getVectorLayers();n(w.map(_=>({id:_,visible:!0})));for(const[_,y]of w.entries())u.addLayer({id:`tileset_fill_${y}`,type:"fill",source:"tileset","source-layer":y,paint:{"fill-color":B(_),"fill-opacity":["case",["boolean",["feature-state","hover"],!1],v,A]},filter:["==",["geometry-type"],"Polygon"]}),u.addLayer({id:`tileset_line_${y}`,type:"line",source:"tileset","source-layer":y,paint:{"line-color":B(_),"line-width":["case",["boolean",["feature-state","hover"],!1],2,.5]},filter:["==",["geometry-type"],"LineString"]}),u.addLayer({id:`tileset_circle_${y}`,type:"circle",source:"tileset","source-layer":y,paint:{"circle-color":B(_),"circle-radius":["interpolate",["linear"],["zoom"],4,2,12,4],"circle-opacity":.5,"circle-stroke-color":"white","circle-stroke-width":["case",["boolean",["feature-state","hover"],!1],3,0]},filter:["==",["geometry-type"],"Point"]});for(const[_,y]of w.entries())u.addLayer({id:`tileset_line_label_${y}`,type:"symbol",source:"tileset","source-layer":y,layout:{"text-field":["get","name"],"text-font":["Noto Sans Regular"],"text-size":10,"symbol-placement":"line"},paint:{"text-color":B(_),"text-halo-color":"black","text-halo-width":2},filter:["==",["geometry-type"],"LineString"]}),u.addLayer({id:`tileset_point_label_${y}`,type:"symbol",source:"tileset","source-layer":y,layout:{"text-field":["get","name"],"text-font":["Noto Sans Regular"],"text-size":10,"text-offset":[0,-1]},paint:{"text-color":B(_),"text-halo-color":"black","text-halo-width":2},filter:["==",["geometry-type"],"Point"]}),u.addLayer({id:`tileset_polygon_label_${y}`,type:"symbol",source:"tileset","source-layer":y,layout:{"text-field":["get","name"],"text-font":["Noto Sans Regular"],"text-max-angle":85,"text-offset":[0,1],"text-anchor":"bottom","text-rotation-alignment":"map","text-keep-upright":!0,"text-size":10,"symbol-placement":"line","symbol-spacing":250},paint:{"text-color":B(_),"text-halo-color":"black","text-halo-width":2},filter:["==",["geometry-type"],"Polygon"]})}else u.addSource("tileset",{type:"raster",url:c.getMaplibreSourceUrl()}),u.addLayer({source:"tileset",id:"tileset_raster",type:"raster",paint:{"raster-resampling":"nearest"}})};return V(()=>{const c=s.tileset();if(ze){ze=!1;return}bt(),Be(c)}),V(()=>{const c=p()?"visible":"none";if(u)for(const g of u.getStyle().layers)"source"in g&&g.source==="basemap"&&u.setLayoutProperty(g.id,"visibility",c)}),V(()=>{const c=s.showTileBoundaries();u&&(u.showTileBoundaries=c)}),V(()=>{if(s.inspectFeatures())f(!1);else{for(const c of l())c.id!==void 0&&u.setFeatureState(c,{hover:!1});x.remove()}}),V(()=>{const c=(g,A)=>{u.getLayer(g)&&u.setLayoutProperty(g,"visibility",A)};for(const{id:g,visible:A}of o()){const v=A?"visible":"none";c(`tileset_fill_${g}`,v),c(`tileset_line_${g}`,v),c(`tileset_circle_${g}`,v),c(`tileset_line_label_${g}`,v),c(`tileset_point_label_${g}`,v),c(`tileset_polygon_label_${g}`,v)}}),Ct(async()=>{if(!e){console.error("Could not mount map element");return}L.getRTLTextPluginStatus()==="unavailable"&&L.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",!0),u=new L.Map({hash:"map",container:e,attributionControl:!1,style:{version:8,glyphs:"https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",sprite:"https://protomaps.github.io/basemaps-assets/sprites/v4/black",sources:{basemap:{type:"vector",tiles:["https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=1003762824b9687f"],maxzoom:15,attribution:"Background © <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a>"}},layers:Lt("basemap",Ot("black"),{lang:"en"}).map(c=>("layout"in c||(c.layout={}),c.layout&&(c.layout.visibility="none"),c))}}),u.addControl(new L.NavigationControl({}),"top-left"),u.addControl(new L.AttributionControl({compact:!1}),"bottom-right"),s.mapHashPassed||je(),s.showTileBoundaries()&&(u.showTileBoundaries=!0),r(u.getZoom()),u.on("zoom",c=>{r(c.target.getZoom())}),u.on("mousemove",async c=>{if(h()||!s.inspectFeatures())return;for(const b of l())b.id!==void 0&&u.setFeatureState(b,{hover:!1});const{x:g,y:A}=c.point,v=2;let w=u.queryRenderedFeatures([[g-v,A-v],[g+v,A+v]]);w=w.filter(b=>b.source==="tileset");for(const b of w)b.id!==void 0&&u.setFeatureState(b,{hover:!0});a(w);const _=i(),y=new Rt,de=await s.tileset().getMaxZoom(),G=Math.max(0,Math.min(de,Math.floor(_))),ue=y.px([c.lngLat.lng,c.lngLat.lat],G),k=Math.floor(ue[0]/256),I=Math.floor(ue[1]/256);t&&(t.innerHTML="",ct(()=>(()=>{var b=As(),P=b.firstChild,pe=P.firstChild,fe=pe.nextSibling,we=fe.nextSibling,X=we.nextSibling;X.nextSibling;var z=P.nextSibling,S=z.firstChild;return E(b,T(Ft,{get features(){return $()}}),P),E(P,G,fe),E(P,k,X),E(P,I,null),E(z,()=>c.lngLat.lng.toFixed(4),S),E(z,()=>c.lngLat.lat.toFixed(4),null),ee(()=>Mt(P,"href",Ut(s.tileset().getStateUrl(),[G,k,I]))),b})(),t),x.setHTML(t.innerHTML),x.setLngLat(c.lngLat),x.addTo(u))}),u.on("click",()=>{f(!h())}),u.on("load",async()=>{await Be(s.tileset()),u.resize()})}),(()=>{var c=Ss(),g=c.firstChild,A=g.firstChild,v=A.firstChild,w=v.nextSibling,_=w.firstChild,y=w.nextSibling,de=y.firstChild,G=y.nextSibling,ue=A.nextSibling,k=ue.firstChild,I=k.nextSibling,b=I.nextSibling,P=b.nextSibling,pe=P.firstChild,fe=pe.firstChild,we=fe.nextSibling;v.$$click=je,_.addEventListener("change",()=>{s.setInspectFeatures(!s.inspectFeatures())}),de.addEventListener("change",()=>{s.setShowTileBoundaries(!s.showTileBoundaries())}),G.$$click=()=>{s.setShowMetadata(!s.showMetadata())};var X=e;typeof X=="function"?We(X,k):e=k;var z=t;return typeof z=="function"?We(z,I):t=I,E(b,T(Nt,{layerVisibility:o,setLayerVisibility:n,basemapOption:!0,basemap:p,setBasemap:d})),pe.$$click=_t,E(we,()=>i().toFixed(2)),E(c,T(ht,{get when(){return s.showMetadata()},get children(){var S=ws();return E(S,T(Cs,{get tileset(){return s.tileset}})),S}}),null),ee(S=>{var De=!!s.inspectFeatures(),Ve=!!h();return De!==S.e&&k.classList.toggle("inspectFeatures",S.e=De),Ve!==S.t&&k.classList.toggle("frozen",S.t=Ve),S},{e:void 0,t:void 0}),ee(()=>_.checked=s.inspectFeatures()),ee(()=>de.checked=s.showTileBoundaries()),c})()}const Cs=s=>{const[e]=Tt(async()=>await s.tileset().getMetadata());return(()=>{var t=Es();return t._$owner=kt(),ee(()=>t.data=e()),t})()};function Ts(){let s=qe(location.hash);const e=new URL(window.location.href),t=e.searchParams.get("url");t&&(e.searchParams.delete("url"),history.pushState(null,"",e.toString()),location.hash=Je(location.hash,{url:t,map:s.map}),s=qe(location.hash));const i=s.iframe==="true",r=s.map!==void 0,[o,n]=C(s.url?At(decodeURIComponent(s.url)):void 0),[l,a]=C(s.showMetadata==="true"||!1),[p,d]=C(s.showTileBoundaries==="true"),[h,f]=C(s.inspectFeatures==="true");return V(()=>{const $=o(),x=$==null?void 0:$.getStateUrl();location.hash=Je(location.hash,{url:x?encodeURIComponent(x):void 0,showMetadata:l()?"true":void 0,showTileBoundaries:p()?"true":void 0,inspectFeatures:h()?"true":void 0})}),T(St,{tileset:o,setTileset:n,page:"map",iframe:i,get children(){return T(ht,{get when(){return o()},get fallback(){return T(wt,{setTileset:n})},children:$=>T(Ps,{tileset:$,showMetadata:l,setShowMetadata:a,showTileBoundaries:p,setShowTileBoundaries:d,inspectFeatures:h,setInspectFeatures:f,mapHashPassed:r})})}})}const at=document.getElementById("root");at&&ct(()=>T(Ts,{}),at);xt(["click"]);
