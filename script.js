const GEOAPIFY_KEY="208f6874a48c45e68761f3d994db6775"

const RESTAURANTE_LAT=-26.464334
const RESTAURANTE_LON=-49.024909

const VALOR_KM=4

let carrinho=[]
let produtos=[]

/* FIREBASE */

const firebaseConfig={
apiKey:"AIzaSyCX",
authDomain:"myproject.firebaseapp.com",
databaseURL:"https://myproject.firebaseio.com",
projectId:"myproject"
}

firebase.initializeApp(firebaseConfig)

/* PRODUTOS */

async function carregarProdutos(){

const r=await fetch("content/produtos.json")

const data=await r.json()

produtos=data.produtos

renderizar()

}

function renderizar(){

const div=document.getElementById("lista-produtos")

div.innerHTML=""

produtos.forEach(p=>{

div.innerHTML+=`
<div class="item">

<div>
<b>${p.title}</b>
<br>
R$ ${p.price}
</div>

<button onclick="add('${p.title}',${p.price})">
Adicionar
</button>

</div>
`

})

}

function add(titulo,preco){

carrinho.push({
title:titulo,
price:preco
})

renderCarrinho()

}

function renderCarrinho(){

const c=document.getElementById("carrinho")

c.innerHTML=""

let sub=0

carrinho.forEach(i=>{

sub+=i.price

c.innerHTML+=`
<div>
${i.title} - R$ ${i.price}
</div>
`

})

document.getElementById("subtotal").innerText=
"R$ "+sub.toFixed(2)

}

/* ENTREGA */

function abrirEntrega(){

document.getElementById("modalEntrega").style.display="block"

}

/* AUTOCOMPLETE ENDEREÇO */

const input=document.getElementById("rua")

if(input){

input.addEventListener("input",async ()=>{

const texto=input.value

if(texto.length<3)return

const url=`https://api.geoapify.com/v1/geocode/autocomplete?text=${texto}&apiKey=${GEOAPIFY_KEY}`

const r=await fetch(url)

const data=await r.json()

const sug=document.getElementById("sugestoes")

sug.innerHTML=""

data.features.forEach(f=>{

const div=document.createElement("div")

div.className="sug"

div.innerText=f.properties.formatted

div.onclick=()=>{

input.value=f.properties.formatted

sug.innerHTML=""

}

sug.appendChild(div)

})

})

}

/* CALCULAR TAXA */

async function processarResumoGeo(){

const rua=document.getElementById("rua").value

const numero=document.getElementById("numero").value

const bairro=document.getElementById("bairro").value

const endereco=`${rua} ${numero} ${bairro}`

const url=`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&apiKey=${GEOAPIFY_KEY}`

const r=await fetch(url)

const data=await r.json()

const coords=data.features[0].geometry.coordinates

const dist=calcularDistancia(
RESTAURANTE_LAT,
RESTAURANTE_LON,
coords[1],
coords[0]
)

const taxa=dist*VALOR_KM

document.getElementById("resumo").innerHTML=
`
Distância: ${dist.toFixed(2)} km
<br>
Taxa entrega: R$ ${taxa.toFixed(2)}
`

}

/* DISTANCIA GPS */

function calcularDistancia(lat1,lon1,lat2,lon2){

const R=6371

const dLat=(lat2-lat1)*Math.PI/180
const dLon=(lon2-lon1)*Math.PI/180

const a=
Math.sin(dLat/2)*Math.sin(dLat/2)+
Math.cos(lat1*Math.PI/180)*
Math.cos(lat2*Math.PI/180)*
Math.sin(dLon/2)*Math.sin(dLon/2)

return R*(2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)))

}

/* ENVIAR PEDIDO */

async function enviarPedidoFirebase(){

const nome=document.getElementById("nomeCliente").value

let total=0

carrinho.forEach(i=>{
total+=i.price
})

await firebase.database().ref("pedidos").push({
cliente:nome,
itens:carrinho,
total:total,
data:new Date().toLocaleString()
})

alert("Pedido enviado")

}

carregarProdutos()
