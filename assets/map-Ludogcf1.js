var Ze=i=>{throw TypeError(i)};var Se=(i,e,t)=>e.has(i)||Ze("Cannot "+t);var I=(i,e,t)=>(Se(i,e,"read from private field"),t?t.call(i):e.get(i)),G=(i,e,t)=>e.has(i)?Ze("Cannot add the same private member more than once"):e instanceof WeakSet?e.add(i):e.set(i,t),ge=(i,e,t,s)=>(Se(i,e,"write to private field"),s?s.call(i,t):e.set(i,t),t),me=(i,e,t)=>(Se(i,e,"access private method"),t);import{r as ct,d as xt,c as P,p as qe,a as Je,b as E,t as At,e as B,S as ht,E as wt,F as St,f as Et,g as Pt,o as Ct,h as _e,i as A,j as Y,k as z,l as Tt,m as kt,s as Mt,n as Ut,u as We}from"./Frame-BmtPjfgE.js";import{m as M,R as Lt,C as Ot,S as Rt}from"./index-C1v7Kok2.js";import{L as Nt,F as Ft}from"./LayersPanel-D3rxy0bd.js";/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ye=globalThis,Oe=ye.ShadowRoot&&(ye.ShadyCSS===void 0||ye.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,Re=Symbol(),Ke=new WeakMap;let dt=class{constructor(e,t,s){if(this._$cssResult$=!0,s!==Re)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(Oe&&e===void 0){const s=t!==void 0&&t.length===1;s&&(e=Ke.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),s&&Ke.set(t,e))}return e}toString(){return this.cssText}};const Ht=i=>new dt(typeof i=="string"?i:i+"",void 0,Re),It=(i,...e)=>{const t=i.length===1?i[0]:e.reduce((s,r,o)=>s+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(r)+i[o+1],i[0]);return new dt(t,i,Re)},zt=(i,e)=>{if(Oe)i.adoptedStyleSheets=e.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const t of e){const s=document.createElement("style"),r=ye.litNonce;r!==void 0&&s.setAttribute("nonce",r),s.textContent=t.cssText,i.appendChild(s)}},Ge=Oe?i=>i:i=>i instanceof CSSStyleSheet?(e=>{let t="";for(const s of e.cssRules)t+=s.cssText;return Ht(t)})(i):i;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:jt,defineProperty:Bt,getOwnPropertyDescriptor:Dt,getOwnPropertyNames:Vt,getOwnPropertySymbols:Zt,getPrototypeOf:qt}=Object,k=globalThis,Xe=k.trustedTypes,Jt=Xe?Xe.emptyScript:"",Ee=k.reactiveElementPolyfillSupport,ee=(i,e)=>i,ve={toAttribute(i,e){switch(e){case Boolean:i=i?Jt:null;break;case Object:case Array:i=i==null?i:JSON.stringify(i)}return i},fromAttribute(i,e){let t=i;switch(e){case Boolean:t=i!==null;break;case Number:t=i===null?null:Number(i);break;case Object:case Array:try{t=JSON.parse(i)}catch{t=null}}return t}},Ne=(i,e)=>!jt(i,e),Ye={attribute:!0,type:String,converter:ve,reflect:!1,hasChanged:Ne};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),k.litPropertyMetadata??(k.litPropertyMetadata=new WeakMap);class D extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??(this.l=[])).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=Ye){if(t.state&&(t.attribute=!1),this._$Ei(),this.elementProperties.set(e,t),!t.noAccessor){const s=Symbol(),r=this.getPropertyDescriptor(e,s,t);r!==void 0&&Bt(this.prototype,e,r)}}static getPropertyDescriptor(e,t,s){const{get:r,set:o}=Dt(this.prototype,e)??{get(){return this[t]},set(n){this[t]=n}};return{get(){return r==null?void 0:r.call(this)},set(n){const l=r==null?void 0:r.call(this);o.call(this,n),this.requestUpdate(e,l,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??Ye}static _$Ei(){if(this.hasOwnProperty(ee("elementProperties")))return;const e=qt(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(ee("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(ee("properties"))){const t=this.properties,s=[...Vt(t),...Zt(t)];for(const r of s)this.createProperty(r,t[r])}const e=this[Symbol.metadata];if(e!==null){const t=litPropertyMetadata.get(e);if(t!==void 0)for(const[s,r]of t)this.elementProperties.set(s,r)}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const r=this._$Eu(t,s);r!==void 0&&this._$Eh.set(r,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const s=new Set(e.flat(1/0).reverse());for(const r of s)t.unshift(Ge(r))}else e!==void 0&&t.push(Ge(e));return t}static _$Eu(e,t){const s=t.attribute;return s===!1?void 0:typeof s=="string"?s:typeof e=="string"?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var e;this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),(e=this.constructor.l)==null||e.forEach(t=>t(this))}addController(e){var t;(this._$EO??(this._$EO=new Set)).add(e),this.renderRoot!==void 0&&this.isConnected&&((t=e.hostConnected)==null||t.call(e))}removeController(e){var t;(t=this._$EO)==null||t.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const s of t.keys())this.hasOwnProperty(s)&&(e.set(s,this[s]),delete this[s]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return zt(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$EO)==null||e.forEach(t=>{var s;return(s=t.hostConnected)==null?void 0:s.call(t)})}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$EO)==null||e.forEach(t=>{var s;return(s=t.hostDisconnected)==null?void 0:s.call(t)})}attributeChangedCallback(e,t,s){this._$AK(e,s)}_$EC(e,t){var o;const s=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,s);if(r!==void 0&&s.reflect===!0){const n=(((o=s.converter)==null?void 0:o.toAttribute)!==void 0?s.converter:ve).toAttribute(t,s.type);this._$Em=e,n==null?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(e,t){var o;const s=this.constructor,r=s._$Eh.get(e);if(r!==void 0&&this._$Em!==r){const n=s.getPropertyOptions(r),l=typeof n.converter=="function"?{fromAttribute:n.converter}:((o=n.converter)==null?void 0:o.fromAttribute)!==void 0?n.converter:ve;this._$Em=r,this[r]=l.fromAttribute(t,n.type),this._$Em=null}}requestUpdate(e,t,s){if(e!==void 0){if(s??(s=this.constructor.getPropertyOptions(e)),!(s.hasChanged??Ne)(this[e],t))return;this.P(e,t,s)}this.isUpdatePending===!1&&(this._$ES=this._$ET())}P(e,t,s){this._$AL.has(e)||this._$AL.set(e,t),s.reflect===!0&&this._$Em!==e&&(this._$Ej??(this._$Ej=new Set)).add(e)}async _$ET(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var s;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[o,n]of this._$Ep)this[o]=n;this._$Ep=void 0}const r=this.constructor.elementProperties;if(r.size>0)for(const[o,n]of r)n.wrapped!==!0||this._$AL.has(o)||this[o]===void 0||this.P(o,this[o],n)}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),(s=this._$EO)==null||s.forEach(r=>{var o;return(o=r.hostUpdate)==null?void 0:o.call(r)}),this.update(t)):this._$EU()}catch(r){throw e=!1,this._$EU(),r}e&&this._$AE(t)}willUpdate(e){}_$AE(e){var t;(t=this._$EO)==null||t.forEach(s=>{var r;return(r=s.hostUpdated)==null?void 0:r.call(s)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EU(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Ej&&(this._$Ej=this._$Ej.forEach(t=>this._$EC(t,this[t]))),this._$EU()}updated(e){}firstUpdated(e){}}D.elementStyles=[],D.shadowRootOptions={mode:"open"},D[ee("elementProperties")]=new Map,D[ee("finalized")]=new Map,Ee==null||Ee({ReactiveElement:D}),(k.reactiveElementVersions??(k.reactiveElementVersions=[])).push("2.0.4");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const te=globalThis,be=te.trustedTypes,Qe=be?be.createPolicy("lit-html",{createHTML:i=>i}):void 0,ut="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,pt="?"+T,Wt=`<${pt}>`,O=document,ie=()=>O.createComment(""),re=i=>i===null||typeof i!="object"&&typeof i!="function",Fe=Array.isArray,Kt=i=>Fe(i)||typeof(i==null?void 0:i[Symbol.iterator])=="function",Pe=`[ 	
\f\r]`,X=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,et=/-->/g,tt=/>/g,U=RegExp(`>|${Pe}(?:([^\\s"'>=/]+)(${Pe}*=${Pe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),st=/'/g,it=/"/g,ft=/^(?:script|style|textarea|title)$/i,Gt=i=>(e,...t)=>({_$litType$:i,strings:e,values:t}),j=Gt(1),R=Symbol.for("lit-noChange"),y=Symbol.for("lit-nothing"),rt=new WeakMap,L=O.createTreeWalker(O,129);function gt(i,e){if(!Fe(i)||!i.hasOwnProperty("raw"))throw Error("invalid template strings array");return Qe!==void 0?Qe.createHTML(e):e}const Xt=(i,e)=>{const t=i.length-1,s=[];let r,o=e===2?"<svg>":e===3?"<math>":"",n=X;for(let l=0;l<t;l++){const a=i[l];let p,h,d=-1,f=0;for(;f<a.length&&(n.lastIndex=f,h=n.exec(a),h!==null);)f=n.lastIndex,n===X?h[1]==="!--"?n=et:h[1]!==void 0?n=tt:h[2]!==void 0?(ft.test(h[2])&&(r=RegExp("</"+h[2],"g")),n=U):h[3]!==void 0&&(n=U):n===U?h[0]===">"?(n=r??X,d=-1):h[1]===void 0?d=-2:(d=n.lastIndex-h[2].length,p=h[1],n=h[3]===void 0?U:h[3]==='"'?it:st):n===it||n===st?n=U:n===et||n===tt?n=X:(n=U,r=void 0);const v=n===U&&i[l+1].startsWith("/>")?" ":"";o+=n===X?a+Wt:d>=0?(s.push(p),a.slice(0,d)+ut+a.slice(d)+T+v):a+T+(d===-2?l:v)}return[gt(i,o+(i[t]||"<?>")+(e===2?"</svg>":e===3?"</math>":"")),s]};class oe{constructor({strings:e,_$litType$:t},s){let r;this.parts=[];let o=0,n=0;const l=e.length-1,a=this.parts,[p,h]=Xt(e,t);if(this.el=oe.createElement(p,s),L.currentNode=this.el.content,t===2||t===3){const d=this.el.content.firstChild;d.replaceWith(...d.childNodes)}for(;(r=L.nextNode())!==null&&a.length<l;){if(r.nodeType===1){if(r.hasAttributes())for(const d of r.getAttributeNames())if(d.endsWith(ut)){const f=h[n++],v=r.getAttribute(d).split(T),w=/([.?@])?(.*)/.exec(f);a.push({type:1,index:o,name:w[2],strings:v,ctor:w[1]==="."?Qt:w[1]==="?"?es:w[1]==="@"?ts:xe}),r.removeAttribute(d)}else d.startsWith(T)&&(a.push({type:6,index:o}),r.removeAttribute(d));if(ft.test(r.tagName)){const d=r.textContent.split(T),f=d.length-1;if(f>0){r.textContent=be?be.emptyScript:"";for(let v=0;v<f;v++)r.append(d[v],ie()),L.nextNode(),a.push({type:2,index:++o});r.append(d[f],ie())}}}else if(r.nodeType===8)if(r.data===pt)a.push({type:2,index:o});else{let d=-1;for(;(d=r.data.indexOf(T,d+1))!==-1;)a.push({type:7,index:o}),d+=T.length-1}o++}}static createElement(e,t){const s=O.createElement("template");return s.innerHTML=e,s}}function J(i,e,t=i,s){var n,l;if(e===R)return e;let r=s!==void 0?(n=t._$Co)==null?void 0:n[s]:t._$Cl;const o=re(e)?void 0:e._$litDirective$;return(r==null?void 0:r.constructor)!==o&&((l=r==null?void 0:r._$AO)==null||l.call(r,!1),o===void 0?r=void 0:(r=new o(i),r._$AT(i,t,s)),s!==void 0?(t._$Co??(t._$Co=[]))[s]=r:t._$Cl=r),r!==void 0&&(e=J(i,r._$AS(i,e.values),r,s)),e}class Yt{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:s}=this._$AD,r=((e==null?void 0:e.creationScope)??O).importNode(t,!0);L.currentNode=r;let o=L.nextNode(),n=0,l=0,a=s[0];for(;a!==void 0;){if(n===a.index){let p;a.type===2?p=new ae(o,o.nextSibling,this,e):a.type===1?p=new a.ctor(o,a.name,a.strings,this,e):a.type===6&&(p=new ss(o,this,e)),this._$AV.push(p),a=s[++l]}n!==(a==null?void 0:a.index)&&(o=L.nextNode(),n++)}return L.currentNode=O,r}p(e){let t=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(e,s,t),t+=s.strings.length-2):s._$AI(e[t])),t++}}class ae{get _$AU(){var e;return((e=this._$AM)==null?void 0:e._$AU)??this._$Cv}constructor(e,t,s,r){this.type=2,this._$AH=y,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=s,this.options=r,this._$Cv=(r==null?void 0:r.isConnected)??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return t!==void 0&&(e==null?void 0:e.nodeType)===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=J(this,e,t),re(e)?e===y||e==null||e===""?(this._$AH!==y&&this._$AR(),this._$AH=y):e!==this._$AH&&e!==R&&this._(e):e._$litType$!==void 0?this.$(e):e.nodeType!==void 0?this.T(e):Kt(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==y&&re(this._$AH)?this._$AA.nextSibling.data=e:this.T(O.createTextNode(e)),this._$AH=e}$(e){var o;const{values:t,_$litType$:s}=e,r=typeof s=="number"?this._$AC(e):(s.el===void 0&&(s.el=oe.createElement(gt(s.h,s.h[0]),this.options)),s);if(((o=this._$AH)==null?void 0:o._$AD)===r)this._$AH.p(t);else{const n=new Yt(r,this),l=n.u(this.options);n.p(t),this.T(l),this._$AH=n}}_$AC(e){let t=rt.get(e.strings);return t===void 0&&rt.set(e.strings,t=new oe(e)),t}k(e){Fe(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let s,r=0;for(const o of e)r===t.length?t.push(s=new ae(this.O(ie()),this.O(ie()),this,this.options)):s=t[r],s._$AI(o),r++;r<t.length&&(this._$AR(s&&s._$AB.nextSibling,r),t.length=r)}_$AR(e=this._$AA.nextSibling,t){var s;for((s=this._$AP)==null?void 0:s.call(this,!1,!0,t);e&&e!==this._$AB;){const r=e.nextSibling;e.remove(),e=r}}setConnected(e){var t;this._$AM===void 0&&(this._$Cv=e,(t=this._$AP)==null||t.call(this,e))}}class xe{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,s,r,o){this.type=1,this._$AH=y,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=o,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=y}_$AI(e,t=this,s,r){const o=this.strings;let n=!1;if(o===void 0)e=J(this,e,t,0),n=!re(e)||e!==this._$AH&&e!==R,n&&(this._$AH=e);else{const l=e;let a,p;for(e=o[0],a=0;a<o.length-1;a++)p=J(this,l[s+a],t,a),p===R&&(p=this._$AH[a]),n||(n=!re(p)||p!==this._$AH[a]),p===y?e=y:e!==y&&(e+=(p??"")+o[a+1]),this._$AH[a]=p}n&&!r&&this.j(e)}j(e){e===y?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class Qt extends xe{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===y?void 0:e}}class es extends xe{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==y)}}class ts extends xe{constructor(e,t,s,r,o){super(e,t,s,r,o),this.type=5}_$AI(e,t=this){if((e=J(this,e,t,0)??y)===R)return;const s=this._$AH,r=e===y&&s!==y||e.capture!==s.capture||e.once!==s.once||e.passive!==s.passive,o=e!==y&&(s===y||r);r&&this.element.removeEventListener(this.name,this,s),o&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){var t;typeof this._$AH=="function"?this._$AH.call(((t=this.options)==null?void 0:t.host)??this.element,e):this._$AH.handleEvent(e)}}class ss{constructor(e,t,s){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(e){J(this,e)}}const Ce=te.litHtmlPolyfillSupport;Ce==null||Ce(oe,ae),(te.litHtmlVersions??(te.litHtmlVersions=[])).push("3.2.1");const is=(i,e,t)=>{const s=(t==null?void 0:t.renderBefore)??e;let r=s._$litPart$;if(r===void 0){const o=(t==null?void 0:t.renderBefore)??null;s._$litPart$=r=new ae(e.insertBefore(ie(),o),o,void 0,t??{})}return r._$AI(i),r};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let se=class extends D{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var t;const e=super.createRenderRoot();return(t=this.renderOptions).renderBefore??(t.renderBefore=e.firstChild),e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=is(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return R}};var lt;se._$litElement$=!0,se.finalized=!0,(lt=globalThis.litElementHydrateSupport)==null||lt.call(globalThis,{LitElement:se});const Te=globalThis.litElementPolyfillSupport;Te==null||Te({LitElement:se});(globalThis.litElementVersions??(globalThis.litElementVersions=[])).push("4.1.1");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const rs={attribute:!0,type:String,converter:ve,reflect:!1,hasChanged:Ne},os=(i=rs,e,t)=>{const{kind:s,metadata:r}=t;let o=globalThis.litPropertyMetadata.get(r);if(o===void 0&&globalThis.litPropertyMetadata.set(r,o=new Map),o.set(t.name,i),s==="accessor"){const{name:n}=t;return{set(l){const a=e.get.call(this);e.set.call(this,l),this.requestUpdate(n,a,i)},init(l){return l!==void 0&&this.P(n,void 0,i),l}}}if(s==="setter"){const{name:n}=t;return function(l){const a=this[n];e.call(this,l),this.requestUpdate(n,a,i)}}throw Error("Unsupported decorator location: "+s)};function mt(i){return(e,t)=>typeof t=="object"?os(i,e,t):((s,r,o)=>{const n=r.hasOwnProperty(o);return r.constructor.createProperty(o,n?{...s,wrapped:!0}:s),n?Object.getOwnPropertyDescriptor(r,o):void 0})(i,e,t)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function $t(i){return mt({...i,state:!0,attribute:!1})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const ns=(i,e,t)=>(t.configurable=!0,t.enumerable=!0,Reflect.decorate&&typeof e!="object"&&Object.defineProperty(i,e,t),t);/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let as;function ls(i){return(e,t)=>ns(e,t,{get(){return(this.renderRoot??as??(as=document.createDocumentFragment())).querySelectorAll(i)}})}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const cs={ATTRIBUTE:1},hs=i=>(...e)=>({_$litDirective$:i,values:e});class ds{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,s){this._$Ct=e,this._$AM=t,this._$Ci=s}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}}/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const us=hs(class extends ds{constructor(i){var e;if(super(i),i.type!==cs.ATTRIBUTE||i.name!=="class"||((e=i.strings)==null?void 0:e.length)>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(i){return" "+Object.keys(i).filter(e=>i[e]).join(" ")+" "}update(i,[e]){var s,r;if(this.st===void 0){this.st=new Set,i.strings!==void 0&&(this.nt=new Set(i.strings.join(" ").split(/\s/).filter(o=>o!=="")));for(const o in e)e[o]&&!((s=this.nt)!=null&&s.has(o))&&this.st.add(o);return this.render(e)}const t=i.element.classList;for(const o of this.st)o in e||(t.remove(o),this.st.delete(o));for(const o in e){const n=!!e[o];n===this.st.has(o)||(r=this.nt)!=null&&r.has(o)||(n?(t.add(o),this.st.add(o)):(t.remove(o),this.st.delete(o)))}return R}});/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function*ps(i,e){if(i!==void 0){let t=0;for(const s of i)yield e(s,t++)}}/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ke(i,e,t){return i?e(i):t==null?void 0:t(i)}var fs=Object.defineProperty,Ae=(i,e,t,s)=>{for(var r=void 0,o=i.length-1,n;o>=0;o--)(n=i[o])&&(r=n(e,t,r)||r);return r&&fs(e,t,r),r};function gs(i){return i instanceof RegExp}function Me(i){return i===null?"null":Array.isArray(i)?"array":i.constructor.name.toLowerCase()}function Q(i){return i!==Object(i)}function ms(i,{nodeCount:e=3,maxLength:t=15}={}){const s=Array.isArray(i),r=Object.keys(i),o=r.slice(0,e),n=[],l=h=>{switch(Me(h)){case"object":return Object.keys(h).length===0?"{ }":"{ ... }";case"array":return h.length===0?"[ ]":"[ ... ]";case"string":return`"${h.substring(0,t)}${h.length>t?"...":""}"`;default:return String(h)}},a=[];for(const h of o){const d=[],f=i[h];s||d.push(`${h}: `),d.push(l(f)),a.push(d.join(""))}r.length>e&&a.push("..."),n.push(a.join(", "));const p=n.join("");return s?`[ ${p} ]`:`{ ${p} }`}function*He(i){const e=[[i,"",[]]];for(;e.length;){const[t,s,r]=e.shift();if(s&&(yield[t,s,r]),!Q(t))for(const[o,n]of Object.entries(t))e.push([n,`${s}${s?".":""}${o}`,[...r,s]])}}function $s(i,e){const t=i.split("."),s=e.split("."),r=a=>a==="*",o=a=>a==="**";let n=0,l=0;for(;n<t.length;){const a=s[l],p=t[n];if(a===p||r(a))l++,n++;else if(o(a))l++,n=t.length-(s.length-l);else return!1}return l===s.length}var ys={fromAttribute:i=>i&&i.trim()?JSON.parse(i):void 0,toAttribute:i=>JSON.stringify(i)},Ue=i=>i!==void 0,yt=(i,e)=>gs(e)?!!i.match(e):$s(i,e),vs=(i,e)=>e.split(".").reduce((t,s)=>t[s],i),ot=(i,e)=>t=>({expanded:{...t.expanded,[i]:Ue(e)?!!e:!t.expanded[i]}}),$e=(i,e)=>(t,s)=>{const r={};if(i)for(const[,o,n]of He(s.data))yt(o,i)&&(r[o]=e,n.forEach(l=>r[l]=e));return{expanded:r}},bs=i=>(e,t)=>{const s={};if(i)for(const[,r,o]of He(t.data))yt(r,i)?(s[r]=!1,o.forEach(n=>s[n]=!1)):s[r]=!0;return{filtered:s}},_s=()=>()=>({filtered:{}}),nt=i=>()=>({highlight:i}),xs=It`
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
`,ne,V,Z,N,vt,Le,q,le=(q=class extends se{constructor(){super();G(this,N);G(this,ne);G(this,V);G(this,Z);this.state={expanded:{},filtered:{},highlight:null},this.lastFocusedItem=null,ge(this,ne,t=>s=>{s.preventDefault(),this.setState(ot(t))}),ge(this,V,t=>{const s=t.target;t.target===this&&me(this,N,Le).call(this,this.lastFocusedItem||this.nodeElements[0]),s.matches('[role="treeitem"]')&&(this.lastFocusedItem&&(this.lastFocusedItem.tabIndex=-1),this.lastFocusedItem=s,this.tabIndex=-1,s.tabIndex=0)}),ge(this,Z,t=>{const s=t.relatedTarget;(!s||!this.contains(s))&&(this.tabIndex=0)}),this.addEventListener("focusin",I(this,V)),this.addEventListener("focusout",I(this,Z))}static customRenderer(t,s){return JSON.stringify(t)}async setState(t){const s=this.state;this.state={...s,...t(s,this)}}connectedCallback(){!this.hasAttribute("data")&&!Ue(this.data)&&this.setAttribute("data",this.innerText),this.setAttribute("role","node"),this.setAttribute("tabindex","0"),super.connectedCallback()}expand(t){this.setState($e(t,!0))}expandAll(){this.setState($e("**",!0))}collapseAll(){this.setState($e("**",!1))}collapse(t){this.setState($e(t,!1))}*search(t){for(const[s,r]of He(this.data))Q(s)&&String(s).match(t)&&(this.expand(r),this.updateComplete.then(()=>{const o=this.shadowRoot.querySelector(`[data-path="${r}"]`);o.scrollIntoView({behavior:"smooth",inline:"center",block:"center"}),o.focus()}),this.setState(nt(r)),yield{value:s,path:r});this.setState(nt(null))}filter(t){this.setState(bs(t))}resetFilter(){this.setState(_s())}renderObject(t,s){return j`
            <ul part="object" role="group">
                ${ps(Object.entries(t),([r,o])=>{const n=s?`${s}.${r}`:r,l=Q(o),a=this.state.expanded[n];return this.state.filtered[n]?y:j`
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
                                      @click="${l?null:I(this,ne).call(this,n)}"
                                  >
                                      ${r}:
                                      ${ke(!l&&!a,()=>this.renderNodePreview(o))}
                                  </span>

                                  ${ke(l||a,()=>this.renderValue(o,n))}
                              </li>
                          `})}
            </ul>
        `}renderValue(t,s=""){return Q(t)?this.renderPrimitive(t,s):this.renderObject(t,s)}renderNodePreview(t){return j`<span part="preview" class="preview"> ${ms(t)} </span>`}renderPrimitive(t,s){const r=this.state.highlight,o=Me(t),n=this.constructor.customRenderer(t,s),l=j`
            <span part="primitive primitive-${o}" class="${Me(t)}"> ${n} </span>
        `;return s===r?j`<mark part="highlight">${l}</mark>`:l}render(){const t=this.data;return j`
            <div
                part="base"
                @keydown=${me(this,N,vt)}
                @focusin="${I(this,V)}"
                @focusout="${I(this,Z)}"
            >
                ${ke(Ue(t),()=>this.renderValue(t))}
            </div>
        `}},ne=new WeakMap,V=new WeakMap,Z=new WeakMap,N=new WeakSet,vt=function(t){if(!["ArrowDown","ArrowUp","ArrowRight","ArrowLeft","Home","End"].includes(t.key))return;const s=[...this.nodeElements],r=this.matches(":dir(ltr)"),o=this.matches(":dir(rtl)");if(s.length>0){t.preventDefault();const n=s.findIndex(f=>f.matches(":focus")),l=s[n],a=this.state.expanded[l.dataset.path],p=Q(vs(this.data,l.dataset.path)),h=f=>{const v=s[Math.max(Math.min(f,s.length-1),0)];me(this,N,Le).call(this,v)},d=f=>{this.setState(ot(l.dataset.path,f))};t.key==="ArrowDown"?h(n+1):t.key==="ArrowUp"?h(n-1):r&&t.key==="ArrowRight"||o&&t.key==="ArrowLeft"?!l||a||p?h(n+1):d(!0):r&&t.key==="ArrowLeft"||o&&t.key==="ArrowRight"?!l||!a||p?h(n-1):d(!1):t.key==="Home"?h(0):t.key==="End"&&h(s.length-1)}},Le=function(t){t.focus()},q.styles=[xs],q);Ae([mt({converter:ys,type:Object})],le.prototype,"data");Ae([$t()],le.prototype,"state");Ae([$t()],le.prototype,"lastFocusedItem");Ae([ls('[role="treeitem"]')],le.prototype,"nodeElements");customElements.define("json-viewer",le);var As=_e('<div><a class="block text-xs btn-primary mt-2 text-center px-2"target=_blank rel=noreferrer>Tile <!>/<!>/</a><div class="text-xs text-center mt-2 font-mono">,'),ws=_e('<div class="md:w-1/2 z-[999] app-bg">'),Ss=_e('<div class="flex flex-col md:flex-row w-full h-full"><div class="flex-1 flex flex-col"><div class="flex-none p-4 flex justify-between text-xs md:text-base space-x-2"><button class="px-4 btn-primary cursor-pointer"type=button>fit to bounds</button><span class="app-border rounded px-2 flex items-center"><input class=mr-1 id=inspectFeatures type=checkbox><label for=inspectFeatures>Inspect features</label></span><span class="app-border rounded px-2 flex items-center"><input class=mr-1 id=showTileBoundaries type=checkbox><label for=showTileBoundaries>Show tile bounds</label></span><button class="px-4 py-1 btn-secondary cursor-pointer"type=button>view metadata</button></div><div class="relative flex-1 h-full"><div class="h-full flex-1 bg-gray-900"></div><div class=hidden></div><div class="absolute right-2 top-2 z-0"></div><div class="absolute left-2 bottom-2"><button type=button class="flex items-center rounded border app-bg app-border cursor-pointer"><span class="app-well px-1 rounded-l">Z</span><span class="px-2 text-base rounded-r-md rounded-r">'),Es=_e("<json-viewer>",!0,!1);function Ps(i){let e,t;const[s,r]=E(0),[o,n]=E([]),[l,a]=E([]),[p,h]=E(!1),[d,f]=E(!1),v=Et(()=>l().map(c=>({layerName:c.sourceLayer||"unknown",id:c.id?c.id:void 0,properties:c.properties,type:c._vectorTileFeature.type}))),w=new M.Popup({closeButton:!1,closeOnClick:!1,maxWidth:"none"}),Ie=new Pt({metadata:!0});M.addProtocol("pmtiles",Ie.tile);let u,ze=!0;const bt=()=>{u.zoomTo(Math.round(u.getZoom()))},je=async()=>{const c=await i.tileset().getBounds();u.fitBounds([[c[0],c[1]],[c[2],c[3]]],{animate:!1})},_t=()=>{for(const c of u.getStyle().layers)"source"in c&&c.source==="tileset"&&u.removeLayer(c.id);"tileset"in u.getStyle().sources&&u.removeSource("tileset")},Be=async c=>{const m=c.archiveForProtocol();if(m&&Ie.add(m),await c.isOverlay()&&h(!0),await c.isVector()){u.addSource("tileset",{type:"vector",url:c.getMaplibreSourceUrl()});const _=await c.getVectorLayers();n(_.map(g=>({id:g,visible:!0})));for(const[g,$]of _.entries())u.addLayer({id:`tileset_fill_${$}`,type:"fill",source:"tileset","source-layer":$,paint:{"fill-color":z(g),"fill-opacity":["case",["boolean",["feature-state","hover"],!1],.25,.1]},filter:["==",["geometry-type"],"Polygon"]}),u.addLayer({id:`tileset_line_${$}`,type:"line",source:"tileset","source-layer":$,paint:{"line-color":z(g),"line-width":["case",["boolean",["feature-state","hover"],!1],2,.5]},filter:["==",["geometry-type"],"LineString"]}),u.addLayer({id:`tileset_circle_${$}`,type:"circle",source:"tileset","source-layer":$,paint:{"circle-color":z(g),"circle-radius":["interpolate",["linear"],["zoom"],4,2,12,4],"circle-opacity":.5,"circle-stroke-color":"white","circle-stroke-width":["case",["boolean",["feature-state","hover"],!1],3,0]},filter:["==",["geometry-type"],"Point"]});for(const[g,$]of _.entries())u.addLayer({id:`tileset_line_label_${$}`,type:"symbol",source:"tileset","source-layer":$,layout:{"text-field":["get","name"],"text-font":["Noto Sans Regular"],"text-size":10,"symbol-placement":"line"},paint:{"text-color":z(g),"text-halo-color":"black","text-halo-width":2},filter:["==",["geometry-type"],"LineString"]}),u.addLayer({id:`tileset_point_label_${$}`,type:"symbol",source:"tileset","source-layer":$,layout:{"text-field":["get","name"],"text-font":["Noto Sans Regular"],"text-size":10,"text-offset":[0,-1]},paint:{"text-color":z(g),"text-halo-color":"black","text-halo-width":2},filter:["==",["geometry-type"],"Point"]}),u.addLayer({id:`tileset_polygon_label_${$}`,type:"symbol",source:"tileset","source-layer":$,layout:{"text-field":["get","name"],"text-font":["Noto Sans Regular"],"text-max-angle":85,"text-offset":[0,1],"text-anchor":"bottom","text-rotation-alignment":"map","text-keep-upright":!0,"text-size":10,"symbol-placement":"line","symbol-spacing":250},paint:{"text-color":z(g),"text-halo-color":"black","text-halo-width":2},filter:["==",["geometry-type"],"Polygon"]})}else u.addSource("tileset",{type:"raster",url:c.getMaplibreSourceUrl()}),u.addLayer({source:"tileset",id:"tileset_raster",type:"raster",paint:{"raster-resampling":"nearest"}})};return B(()=>{const c=i.tileset();if(ze){ze=!1;return}_t(),Be(c)}),B(()=>{const c=p()?"visible":"none";if(u)for(const m of u.getStyle().layers)"source"in m&&m.source==="basemap"&&u.setLayoutProperty(m.id,"visibility",c)}),B(()=>{const c=i.showTileBoundaries();u&&(u.showTileBoundaries=c)}),B(()=>{if(i.inspectFeatures())f(!1);else{for(const c of l())c.id!==void 0&&u.setFeatureState(c,{hover:!1});w.remove()}}),B(()=>{const c=(m,_)=>{u.getLayer(m)&&u.setLayoutProperty(m,"visibility",_)};for(const{id:m,visible:_}of o()){const g=_?"visible":"none";c(`tileset_fill_${m}`,g),c(`tileset_line_${m}`,g),c(`tileset_circle_${m}`,g),c(`tileset_line_label_${m}`,g),c(`tileset_point_label_${m}`,g),c(`tileset_polygon_label_${m}`,g)}}),Ct(async()=>{if(!e){console.error("Could not mount map element");return}M.getRTLTextPluginStatus()==="unavailable"&&M.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",!0),u=new M.Map({hash:"map",container:e,attributionControl:!1,style:{version:8,glyphs:"https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",sprite:"https://protomaps.github.io/basemaps-assets/sprites/v4/black",sources:{basemap:{type:"vector",tiles:["https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=1003762824b9687f"],maxzoom:15,attribution:"Background © <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a>"}},layers:Lt("basemap",Ot("black"),{lang:"en"}).map(c=>("layout"in c||(c.layout={}),c.layout&&(c.layout.visibility="none"),c))}}),u.addControl(new M.NavigationControl({}),"top-left"),u.addControl(new M.AttributionControl({compact:!1}),"bottom-right"),i.mapHashPassed||je(),r(u.getZoom()),u.on("zoom",c=>{r(c.target.getZoom())}),u.on("mousemove",async c=>{if(d()||!i.inspectFeatures())return;for(const b of l())b.id!==void 0&&u.setFeatureState(b,{hover:!1});const{x:m,y:_}=c.point,g=2;let $=u.queryRenderedFeatures([[m-g,_-g],[m+g,_+g]]);$=$.filter(b=>b.source==="tileset");for(const b of $)b.id!==void 0&&u.setFeatureState(b,{hover:!0});a($);const ce=s(),he=new Rt,de=await i.tileset().getMaxZoom(),W=Math.max(0,Math.min(de,Math.floor(ce))),ue=he.px([c.lngLat.lng,c.lngLat.lat],W),C=Math.floor(ue[0]/256),F=Math.floor(ue[1]/256);t&&(t.innerHTML="",ct(()=>(()=>{var b=As(),S=b.firstChild,pe=S.firstChild,fe=pe.nextSibling,we=fe.nextSibling,K=we.nextSibling;K.nextSibling;var H=S.nextSibling,x=H.firstChild;return A(b,P(Ft,{get features(){return v()}}),S),A(S,W,fe),A(S,C,K),A(S,F,null),A(H,()=>c.lngLat.lng.toFixed(4),x),A(H,()=>c.lngLat.lat.toFixed(4),null),Y(()=>Mt(S,"href",Ut(i.tileset().getStateUrl(),[W,C,F]))),b})(),t),w.setHTML(t.innerHTML),w.setLngLat(c.lngLat),w.addTo(u))}),u.on("click",()=>{f(!d())}),u.on("load",async()=>{await Be(i.tileset()),u.resize()})}),(()=>{var c=Ss(),m=c.firstChild,_=m.firstChild,g=_.firstChild,$=g.nextSibling,ce=$.firstChild,he=$.nextSibling,de=he.firstChild,W=he.nextSibling,ue=_.nextSibling,C=ue.firstChild,F=C.nextSibling,b=F.nextSibling,S=b.nextSibling,pe=S.firstChild,fe=pe.firstChild,we=fe.nextSibling;g.$$click=je,ce.addEventListener("change",()=>{i.setInspectFeatures(!i.inspectFeatures())}),de.addEventListener("change",()=>{i.setShowTileBoundaries(!i.showTileBoundaries())}),W.$$click=()=>{i.setShowMetadata(!i.showMetadata())};var K=e;typeof K=="function"?We(K,C):e=C;var H=t;return typeof H=="function"?We(H,F):t=F,A(b,P(Nt,{layerVisibility:o,setLayerVisibility:n,basemapOption:!0,basemap:p,setBasemap:h})),pe.$$click=bt,A(we,()=>s().toFixed(2)),A(c,P(ht,{get when(){return i.showMetadata()},get children(){var x=ws();return A(x,P(Cs,{get tileset(){return i.tileset}})),x}}),null),Y(x=>{var De=!!i.inspectFeatures(),Ve=!!d();return De!==x.e&&C.classList.toggle("inspectFeatures",x.e=De),Ve!==x.t&&C.classList.toggle("frozen",x.t=Ve),x},{e:void 0,t:void 0}),Y(()=>ce.checked=i.inspectFeatures()),Y(()=>de.checked=i.showTileBoundaries()),c})()}const Cs=i=>{const[e]=Tt(async()=>await i.tileset().getMetadata());return(()=>{var t=Es();return t._$owner=kt(),Y(()=>t.data=e()),t})()};function Ts(){let i=qe(location.hash);const e=new URL(window.location.href),t=e.searchParams.get("url");t&&(e.searchParams.delete("url"),history.pushState(null,"",e.toString()),location.hash=Je(location.hash,{url:t,map:i.map}),i=qe(location.hash));const s=i.map!==void 0,[r,o]=E(i.url?At(decodeURIComponent(i.url)):void 0),[n,l]=E(i.showMetadata==="true"||!1),[a,p]=E(i.showTileBoundaries==="true"),[h,d]=E(i.inspectFeatures==="true");return B(()=>{const f=r(),v=f==null?void 0:f.getStateUrl();location.hash=Je(location.hash,{url:v?encodeURIComponent(v):void 0,showMetadata:n()?"true":void 0,showTileBoundaries:a()?"true":void 0,inspectFeatures:h()?"true":void 0})}),P(St,{tileset:r,setTileset:o,page:"map",get children(){return P(ht,{get when(){return r()},get fallback(){return P(wt,{setTileset:o})},children:f=>P(Ps,{tileset:f,showMetadata:n,setShowMetadata:l,showTileBoundaries:a,setShowTileBoundaries:p,inspectFeatures:h,setInspectFeatures:d,mapHashPassed:s})})}})}const at=document.getElementById("root");at&&ct(()=>P(Ts,{}),at);xt(["click"]);
