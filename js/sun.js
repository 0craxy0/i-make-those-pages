// WebGL ASCII sunset: the sunset scene is rendered as characters from a glyph atlas,
// coloured with a flowing gradient in the Obsidian violets. The cursor lights up the characters near it,
// the sun leans toward the mouse and sinks as you scroll. Falls back to the CSS sun.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.getElementById("sunGL");
  const gl = c && c.getContext("webgl", { antialias: false });
  if (!gl) return;

  const RAMP = " .,:;-~=+*xo#%@";
  const N = RAMP.length, TILE = 32;

  // glyph atlas: one row of white glyphs on transparent
  const atlas = document.createElement("canvas");
  atlas.width = TILE * N; atlas.height = TILE;
  const a = atlas.getContext("2d");
  a.fillStyle = "#fff"; a.textAlign = "center"; a.textBaseline = "middle";
  a.font = `600 ${TILE * 0.82}px "JetBrains Mono", ui-monospace, monospace`;
  const paintAtlas = () => { a.clearRect(0, 0, atlas.width, atlas.height); [...RAMP].forEach((ch, i) => a.fillText(ch, i * TILE + TILE / 2, TILE / 2 + 1)); };

  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `precision mediump float;
uniform vec2 r;uniform float t,s,cs;uniform vec2 m,mp;uniform sampler2D atl;
const float N=${N}.;
float scene(vec2 uv,float w){
  float hz=.2;
  vec2 c=vec2(w*.47+m.x*.04, hz+.05-s*.25+m.y*.015);
  float R=.13, v=0.;
  if(uv.y>hz){
    v=.5*exp(-(uv.y-hz)*11.)*(.75+.25*sin(uv.x*18.+t*1.3)*sin(uv.y*30.-t));
    float d=length(uv-c);
    if(d<R){
      v=.95-d/R*.25;
      float y=(c.y-uv.y)/R;
      if(y>-.35){ float band=fract(y*3.5-t*.1); if(band<(y+.35)*.42) v=.18; }
    }
  }else{
    float depth=hz-uv.y;
    float wave=sin(uv.y*120.+t*2.)*.01*(1.+depth*5.)+sin(uv.y*45.-t*1.2+uv.x*3.)*.007;
    v=.1+.05*sin(uv.x*25.+uv.y*60.-t*2.);
    float streak=.5+.5*sin(uv.y*260.-t*3.+sin(uv.x*8.+t)*2.);
    if(abs(uv.x+wave-c.x)<R*(1.-depth*1.6)) v=max(v,.35+.5*streak);
    if(depth<.007) v=.6;
  }
  float md=length(uv-mp);
  v+=.35*exp(-md*md*90.);
  return clamp(v,0.,.999);
}
vec3 ramp(float k){
  vec3 ember=vec3(.165,.129,.251), sun=vec3(.482,.325,.902), gold=vec3(.659,.545,.98), cream=vec3(.91,.878,1.);
  k=clamp(k,0.,1.);
  return k<.4?mix(ember,sun,k/.4):k<.75?mix(sun,gold,(k-.4)/.35):mix(gold,cream,(k-.75)/.25);
}
void main(){
  vec2 cell=floor(gl_FragCoord.xy/cs);
  vec2 local=fract(gl_FragCoord.xy/cs);
  float w=r.x/r.y;
  vec2 uv=(cell*cs+cs*.5)/r.y;
  float v=scene(uv,w);
  float idx=floor(v*N);
  float g=texture2D(atl,vec2((idx+local.x)/N,local.y)).a;
  float flow=.5+.5*sin(uv.x*2.4+uv.y*1.6-t*.7);                     // gradient drifts across the art
  vec3 col=ramp(v*.85+flow*.25);
  gl_FragColor=vec4(mix(vec3(.118,.118,.118),col,g),1.);
}`;
  const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return gl.getShaderParameter(o, gl.COMPILE_STATUS) ? o : null; };
  const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return;
  const pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  const upload = () => {
    paintAtlas();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };
  upload();
  if (document.fonts) document.fonts.load('600 20px "JetBrains Mono"').then(upload).catch(() => {});

  const U = n => gl.getUniformLocation(pr, n);
  const uR = U("r"), uT = U("t"), uS = U("s"), uM = U("m"), uMP = U("mp"), uCS = U("cs");
  gl.uniform1i(U("atl"), 0);

  document.documentElement.classList.add("gl");
  const hero = c.parentElement;
  let dpr = 1;
  const size = () => { dpr = Math.min(devicePixelRatio, 2); c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; gl.viewport(0, 0, c.width, c.height); };
  addEventListener("resize", size); size();

  const mouse = { x: 0, y: 0 }, aim = { x: 0, y: 0 }, mp = { x: -9, y: -9 }, mpAim = { x: -9, y: -9 };
  hero.addEventListener("pointermove", e => {
    const b = c.getBoundingClientRect();
    aim.x = (e.clientX - b.left) / b.width * 2 - 1; aim.y = -((e.clientY - b.top) / b.height * 2 - 1);
    mpAim.x = (e.clientX - b.left) / b.height; mpAim.y = (b.bottom - e.clientY) / b.height;
  });
  hero.addEventListener("pointerleave", () => { aim.x = aim.y = 0; mpAim.x = mpAim.y = -9; });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(c);
  const t0 = performance.now();
  function draw(now) {
    if (!visible) return;
    mouse.x += (aim.x - mouse.x) * .06; mouse.y += (aim.y - mouse.y) * .06;
    mp.x += (mpAim.x - mp.x) * .2; mp.y += (mpAim.y - mp.y) * .2;
    gl.uniform2f(uR, c.width, c.height);
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.uniform1f(uS, Math.min(scrollY / hero.offsetHeight, 1));
    gl.uniform2f(uM, mouse.x, mouse.y);
    gl.uniform2f(uMP, mp.x, mp.y);
    gl.uniform1f(uCS, (innerWidth < 600 ? 9 : 11) * dpr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
