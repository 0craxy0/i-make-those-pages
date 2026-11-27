// WebGL sunset: flat-colour sun with rippling stripes, reflected in moving water.
// Follows the mouse a little, sinks as you scroll. Falls back to the CSS sun.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.getElementById("sunGL");
  const gl = c && c.getContext("webgl", { antialias: true, premultipliedAlpha: false });
  if (!gl) return;

  const vs = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs = `precision mediump float;
uniform vec2 r;uniform float t,s;uniform vec2 m;
const vec3 SKY=vec3(.949,.392,.227),SUN=vec3(1.,.757,.353),SEA=vec3(.878,.333,.18),GLINT=vec3(1.,.69,.29);
void main(){
  vec2 uv=gl_FragCoord.xy/r.y; float w=r.x/r.y;
  float hz=.34;
  vec2 c=vec2(w*.62+m.x*.06, hz+.1-s*.32+m.y*.02);
  float R=.30;
  vec3 col=SKY;
  if(uv.y>hz){
    float d=length(uv-c);
    if(d<R){
      col=SUN;
      float y=(c.y-uv.y)/R;               // 0 at centre, 1 at bottom of sun
      if(y>.05){
        float band=fract(y*5.-t*.12);
        if(band<y*.55) col=SKY;           // stripes thicken toward the horizon
      }
    }
  }else{
    float depth=hz-uv.y;
    float wave=sin(uv.y*140.+t*2.2)*.012*(1.+depth*6.)+sin(uv.y*60.-t*1.3+uv.x*3.)*.008;
    vec2 q=vec2(uv.x+wave, hz+(hz-uv.y)*1.6);
    col=SEA;
    float streak=step(.55,fract(uv.y*48.-t*.4+sin(uv.x*9.+t)*.15));
    if(abs(q.x-c.x)<R*(1.-depth*1.4) && q.y<c.y+R && q.y>c.y-R && streak>.5) col=GLINT;
    if(depth<.004) col=vec3(.086,.188,.165);   // ink horizon line
  }
  gl_FragColor=vec4(col,1.);
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
  const U = n => gl.getUniformLocation(pr, n);
  const uR = U("r"), uT = U("t"), uS = U("s"), uM = U("m");

  document.documentElement.classList.add("gl");
  const hero = c.parentElement;
  const size = () => { const d = Math.min(devicePixelRatio, 2); c.width = c.clientWidth * d; c.height = c.clientHeight * d; gl.viewport(0, 0, c.width, c.height); };
  addEventListener("resize", size); size();

  const mouse = { x: 0, y: 0 }, aim = { x: 0, y: 0 };
  hero.addEventListener("pointermove", e => { const b = hero.getBoundingClientRect(); aim.x = (e.clientX - b.left) / b.width * 2 - 1; aim.y = -((e.clientY - b.top) / b.height * 2 - 1); });
  hero.addEventListener("pointerleave", () => { aim.x = aim.y = 0; });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) requestAnimationFrame(draw); }).observe(c);
  const t0 = performance.now();
  function draw(now) {
    if (!visible) return;
    mouse.x += (aim.x - mouse.x) * .06; mouse.y += (aim.y - mouse.y) * .06;
    gl.uniform2f(uR, c.width, c.height);
    gl.uniform1f(uT, (now - t0) / 1000);
    gl.uniform1f(uS, Math.min(scrollY / hero.offsetHeight, 1));
    gl.uniform2f(uM, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
})();
