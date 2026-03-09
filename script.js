const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";

/* COORDENADA CORRETA DO RESTAURANTE */
const RESTAURANTE_LAT = -26.464334;
const RESTAURANTE_LON = -49.024909;

const TAXA_BASE = 0;
const VALOR_POR_KM = 4.00;
const LIMITE_KM = 15;

let carrinho = [];
let produtosGeral = [];
let taxaEntregaCalculada = 0;
let descontoAplicado = 0;

const TAXAS_POR_BAIRRO = {
    "amizade": 5.00,
    "centro": 4.00,
    "baependi": 5.00,
    "ilha da figueira": 7.00,
    "vila nova": 6.00,
    "default": 7.00
};

document.addEventListener("DOMContentLoaded", () => {
    carregarCardapioCompleto();
    carregarCarrinhoStorage();
});

/* =========================
   CARREGAR CARDAPIO
========================= */

async function carregarCardapioCompleto() {
    const res = await fetch("content/produtos.json?v=" + Date.now());
    const data = await res.json();
    produtosGeral = data.produtos;
    renderizarCardapio();
}

/* =========================
   CARRINHO
========================= */

function adicionarAoCarrinho(titulo, preco) {

    carrinho.push({
        title: titulo,
        price: preco
    });

    atualizarCarrinho();
}

function atualizarCarrinho() {

    let sub = 0;

    carrinho.forEach(i => {
        sub += i.price;
    });

    document.getElementById("subtotal").innerText =
        `R$ ${sub.toFixed(2)}`;

    document.getElementById("total").innerText =
        `R$ ${(sub - descontoAplicado).toFixed(2)}`;

    document.getElementById("cart-count").innerText =
        carrinho.length;

    localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

function removerItem(i) {
    carrinho.splice(i,1);
    atualizarCarrinho();
}

/* =========================
   TAXA ENTREGA (CORRIGIDA)
========================= */

async function processarResumoGeo() {

    const nome = document.getElementById("nomeCliente").value;
    const rua = document.getElementById("rua").value;
    const numero = document.getElementById("numero").value;
    const bairro = document.getElementById("bairro").value.trim();
    const cidade = document.getElementById("cidade").value;

    if(!nome || !rua || !numero){
        alert("Preencha nome, rua e número.");
        return;
    }

    document.getElementById("loading-geral").style.display="flex";

    try{

        const endereco =
        `${rua}, ${numero}, ${bairro}, ${cidade}, SC, Brasil`;

        const url =
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(endereco)}&limit=1&apiKey=${GEOAPIFY_KEY}`;

        const resp = await fetch(url);
        const data = await resp.json();

        if(data.features.length > 0){

            const coords = data.features[0].geometry.coordinates;

            const lonDest = coords[0];
            const latDest = coords[1];

            const distancia = calcularDistancia(
                RESTAURANTE_LAT,
                RESTAURANTE_LON,
                latDest,
                lonDest
            );

            if(distancia > LIMITE_KM){

                alert(
                `Entrega fora da área (${distancia.toFixed(1)}km)`
                );

                document.getElementById("loading-geral").style.display="none";
                return;
            }

            taxaEntregaCalculada =
            Number((TAXA_BASE + distancia * VALOR_POR_KM).toFixed(2));

        }else{

            const key = bairro.toLowerCase();

            taxaEntregaCalculada =
            TAXAS_POR_BAIRRO[key] ||
            TAXAS_POR_BAIRRO.default;

        }

    }catch(e){

        taxaEntregaCalculada = TAXAS_POR_BAIRRO.default;

    }

    document.getElementById("loading-geral").style.display="none";

    mostrarResumoFinal();
}

/* =========================
   CALCULO DISTANCIA REAL
========================= */

function calcularDistancia(lat1, lon1, lat2, lon2) {

    const R = 6371;

    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;

    const a =
    Math.sin(dLat/2)*Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180)*
    Math.cos(lat2*Math.PI/180)*
    Math.sin(dLon/2)*Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));

    return R * c;
}

/* =========================
   RESUMO
========================= */

function mostrarResumoFinal(){

    const resumoItens =
    document.getElementById("resumo-itens");

    resumoItens.innerHTML="";

    let sub = 0;

    carrinho.forEach(i=>{

        sub += i.price;

        resumoItens.innerHTML +=
        `<div class="resumo-linha">
        <span>${i.title}</span>
        <span>R$ ${i.price.toFixed(2)}</span>
        </div>`;
    });

    const total =
    sub + taxaEntregaCalculada - descontoAplicado;

    document.getElementById("resumo-taxa").innerHTML =
    `Subtotal: R$ ${sub.toFixed(2)}<br>
     Taxa entrega: R$ ${taxaEntregaCalculada.toFixed(2)}`;

    document.getElementById("resumo-total").innerText =
    `Total: R$ ${total.toFixed(2)}`;

    document.getElementById("form-entrega").style.display="none";
    document.getElementById("resumo-pedido").style.display="block";
}

/* =========================
   FINALIZAR PEDIDO
========================= */

async function enviarPedidoFirebase(){

    const nome =
    document.getElementById("nomeCliente").value;

    const rua =
    document.getElementById("rua").value;

    const numero =
    document.getElementById("numero").value;

    const bairro =
    document.getElementById("bairro").value;

    let sub = 0;

    carrinho.forEach(i=>{
        sub+=i.price;
    });

    const total =
    sub + taxaEntregaCalculada;

    const pedido = {

        cliente:nome,

        endereco:
        `${rua}, ${numero} - ${bairro}`,

        itens:carrinho,

        total:total,

        data:new Date().toLocaleString("pt-BR")
    };

    await firebase
    .database()
    .ref("pedidos")
    .push(pedido);

    let msg =
`*NOVO PEDIDO - KINGS BURGER*

Cliente: ${nome}
Endereço: ${rua}, ${numero} - ${bairro}

ITENS:
`;

    carrinho.forEach(i=>{
        msg+=`- ${i.title}\n`;
    });

    msg+=`\nTOTAL: R$ ${total.toFixed(2)}`;

    const telefone = "5547984196636";

    window.location.href =
    `https://api.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(msg)}`;
}

/* =========================
   STORAGE
========================= */

function carregarCarrinhoStorage(){

    const s = localStorage.getItem("carrinho");

    if(s){
        carrinho = JSON.parse(s);
        atualizarCarrinho();
    }

}
