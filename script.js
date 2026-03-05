// ===============================
// CONFIGURAÇÕES GLOBAIS
// ===============================

const GEOAPIFY_KEY = "208f6874a48c45e68761f3d994db6775";

const RESTAURANTE_COORD = [-49.024909, -26.464334];

const VALOR_POR_KM = 4;

const TAXA_MINIMA = 5;



let carrinho = [];
let produtosGeral = [];

let taxaEntregaCalculada = 0;
let descontoAplicado = 0;



// ===============================
// INICIALIZAÇÃO
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    carregarCardapioCompleto();
    carregarCarrinhoStorage();

    window.addEventListener("scroll", sincronizarScrollMenu);

});



// ===============================
// FOOTER INTELIGENTE
// ===============================

function gerenciarFooter(visivel) {

    const footer = document.querySelector("footer");

    if (!footer) return;

    if (visivel) {

        footer.style.opacity = "1";
        footer.style.pointerEvents = "auto";

    } else {

        footer.style.opacity = "0";
        footer.style.pointerEvents = "none";

    }

}



// ===============================
// CARREGAR CARDÁPIO
// ===============================

async function carregarCardapioCompleto() {

    try {

        const res = await fetch("content/produtos.json?v=" + Date.now());

        const data = await res.json();

        produtosGeral = data.produtos;

        renderizarCardapio();

    } catch (e) {

        console.error("Erro JSON:", e);

    }

}



// ===============================
// RENDERIZAR CARDÁPIO
// ===============================

function renderizarCardapio() {

    const corpo = document.getElementById("cardapio-corpo");

    const nav = document.getElementById("categorias-scroll");

    corpo.innerHTML = "";
    nav.innerHTML = "";

    const categorias = [...new Set(produtosGeral.map(p => p.categoria))];



    categorias.forEach((cat, idx) => {

        const btn = document.createElement("button");

        btn.className = `cat-item ${idx === 0 ? 'active' : ''}`;

        btn.innerText = cat.toUpperCase();

        btn.onclick = () => scrollToCategoria(cat);

        nav.appendChild(btn);



        const section = document.createElement("section");

        section.className = "secao-categoria";

        section.id = `secao-${cat}`;

        section.innerHTML = `<h2>${cat.toUpperCase()}</h2>`;



        produtosGeral

            .filter(p => p.categoria === cat)

            .forEach(p => {

                section.innerHTML += `

                <div class="item-produto-lista" onclick="adicionarAoCarrinho('${p.title}',${p.price})">

                    <div>

                        <h3>${p.title}</h3>

                        <p>${p.ingredientes || ""}</p>

                        <b>R$ ${p.price.toFixed(2)}</b>

                    </div>

                    <img src="${p.image}" width="70">

                </div>

                `;

            });



        corpo.appendChild(section);

    });

}



// ===============================
// CARRINHO
// ===============================

function adicionarAoCarrinho(nome, preco) {

    carrinho.push({

        title: nome,

        price: preco

    });



    atualizarCarrinho();

}



function atualizarCarrinho() {

    const box = document.getElementById("cart-items");

    box.innerHTML = "";

    let subtotal = 0;



    carrinho.forEach((item, index) => {

        subtotal += item.price;



        box.innerHTML += `

        <div class="cart-item">

            <span>${item.title}</span>

            <b>R$ ${item.price.toFixed(2)}</b>

            <button onclick="removerItem(${index})">X</button>

        </div>

        `;

    });



    document.getElementById("subtotal").innerText = "R$ " + subtotal.toFixed(2);



    const total = subtotal + taxaEntregaCalculada - descontoAplicado;



    document.getElementById("total").innerText = "R$ " + total.toFixed(2);



    document.getElementById("cart-count").innerText = carrinho.length;



    localStorage.setItem("carrinho", JSON.stringify(carrinho));

}



function removerItem(i) {

    carrinho.splice(i, 1);

    atualizarCarrinho();

}



function carregarCarrinhoStorage() {

    const data = localStorage.getItem("carrinho");

    if (data) {

        carrinho = JSON.parse(data);

        atualizarCarrinho();

    }

}



// ===============================
// CALCULAR DISTÂNCIA REAL
// ===============================

async function calcularTaxaEntrega(latCliente, lonCliente) {

    try {

        const url = `https://api.geoapify.com/v1/routing?waypoints=${latCliente},${lonCliente}|${RESTAURANTE_COORD[1]},${RESTAURANTE_COORD[0]}&mode=drive&apiKey=${GEOAPIFY_KEY}`;

        const resp = await fetch(url);

        const data = await resp.json();



        const metros = data.features[0].properties.distance;

        const km = metros / 1000;



        taxaEntregaCalculada = km * VALOR_POR_KM;



        if (taxaEntregaCalculada < TAXA_MINIMA) {

            taxaEntregaCalculada = TAXA_MINIMA;

        }



        return km;

    }

    catch (e) {

        console.error(e);

        taxaEntregaCalculada = TAXA_MINIMA;

    }

}



// ===============================
// PROCESSAR ENDEREÇO
// ===============================

async function processarResumoGeo() {

    const rua = document.getElementById("rua").value;

    const numero = document.getElementById("numero").value;



    if (!rua || !numero) {

        alert("Preencha rua e número");

        return;

    }



    const loader = document.getElementById("loading-geral");

    loader.style.display = "flex";



    try {

        const query = encodeURIComponent(`${rua}, ${numero}, Guaramirim, SC, Brasil`);

        const resp = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${query}&apiKey=${GEOAPIFY_KEY}`);

        const data = await resp.json();



        if (data.features.length > 0) {

            const [lon, lat] = data.features[0].geometry.coordinates;

            await calcularTaxaEntrega(lat, lon);

        }



    } catch (e) {

        taxaEntregaCalculada = TAXA_MINIMA;

    }



    loader.style.display = "none";



    mostrarResumoFinal();

}



// ===============================
// ENVIAR PEDIDO
// ===============================

async function enviarPedidoFinal() {

    const loader = document.getElementById("loading-geral");

    const msg = document.getElementById("msg-pedido");



    loader.style.display = "flex";



    const dados = {

        nome: document.getElementById("nomeCliente").value,

        rua: document.getElementById("rua").value,

        numero: document.getElementById("numero").value,

        bairro: document.getElementById("bairro").value,

        pagamento: document.getElementById("pagamento").value

    };



    try {

        await salvarPedidoFirebase(dados);



        await new Promise(r => setTimeout(r, 3000));



        loader.style.display = "none";



        msg.style.display = "flex";

        msg.innerHTML = `

        <div>

            <h2>Pedido enviado!</h2>

            <p>Acompanhe seu pedido em <b>PEDIDOS</b></p>

        </div>

        `;



        await new Promise(r => setTimeout(r, 1500));



        msg.style.display = "none";



        carrinho = [];

        localStorage.removeItem("carrinho");



        atualizarCarrinho();



        document.getElementById("delivery-modal").style.display = "none";



        gerenciarFooter(true);



    }

    catch (e) {

        alert("Erro ao enviar pedido");

    }

}



// ===============================
// FIREBASE
// ===============================

const db = inicializarFirebase();



function inicializarFirebase() {

    if (typeof firebase !== 'undefined') {



        const firebaseConfig = {

            apiKey: "AIzaSyCXA1yP1F-riNkzOX5zJs5gsQ82EzsT7Qg",

            authDomain: "myproject26-10f0e.firebaseapp.com",

            databaseURL: "https://myproject26-10f0e-default-rtdb.firebaseio.com",

            projectId: "myproject26-10f0e",

            storageBucket: "myproject26-10f0e.appspot.com",

            messagingSenderId: "884850608032",

            appId: "1:884850608032:web:79db6983346c3c20edc6c5"

        };



        if (!firebase.apps.length) {

            firebase.initializeApp(firebaseConfig);

        }



        return firebase.database();

    }



    return null;

}



function salvarPedidoFirebase(dados) {

    if (!db) return;



    const novoPedido = db.ref("pedidos").push();



    return novoPedido.set({

        cliente: dados.nome,

        endereco: `${dados.rua}, ${dados.numero} - ${dados.bairro}`,

        pagamento: dados.pagamento,

        itens: carrinho,

        total:

            carrinho.reduce((acc, i) => acc + i.price, 0) +

            taxaEntregaCalculada -

            descontoAplicado,

        status: "pendente",

        horario: new Date().toLocaleTimeString("pt-BR")

    });

}