
// Creem el mapa amb centre catalunya (coordenades aprox)
var map = L.map('map').setView([41.826, 1.608], 9);
var street =  L.tileLayer('https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=dFOre1P8kYDataLrxmBQ', {
									       attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
												     }).addTo(map);
// Necessari per ajuntar punts
let cluster = new L.MarkerClusterGroup();

//Definim icona
//var greenIcon = L.icon({
//				    iconUrl: 'leaf-green.png',
//				    shadowUrl: 'leaf-shadow.png',
//
//				    iconSize:     [38, 95], // size of the icon
//				    shadowSize:   [50, 64], // size of the shadow
//				    iconAnchor:   [22, 94], // point of the icon which will correspond to marker's location
//				    shadowAnchor: [4, 62],  // the same for the shadow
//				    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
//});




let F = 0; // per saber si s'esta filtran o no => nombre de criteris seleccionats
let filtres =  {diversitats: [], tags: [], oferta: [],sectors: []}; // Les opcions del menu de filtratge
let actuals = []; // Llista dels Punts pintats
let exclos = []; // Llista dels Punts que no es pinten
let shown = 0

let nomFiltrat = [];
let NOM =  "";

/*
 * Creem el html template que apareixerà en el pop-up en un string i creem el punt 
 * i l'afegim al mapa
 */
function pintaPunt(d){

	// Afegim el nom com a titol
	con = "<h2><b>"+d.nom+"</b></h2>";
	

	// Afegir imatge 
	con += "<img class=\"fit\" src=\""+d.imatge+"\"/>";
	// Afegim criteris (etiquetes)
	for(i = 0; i < d.ambits.length; ++i) {
		con += "<span class=\"tag dive\">"+d.ambits[i]+"</span>";
	}
	for(i = 0; i < d.etiquetes.length; ++i) {
		con += "<span class=\"tag etiq\">"+d.etiquetes[i]+"</span>";
	}
	for(i = 0; i < d.oferir.length; ++i) {
		con += "<span class=\"tag ofer\">"+d.oferir[i]+"</span>";
	}
	
	// Afegim contacte
	if(d.contacte.web != "") {
		con +="<br/>"+"<i class=\"fa fa-globe\"></i> &nbsp; <a href=\"" + d.contacte.web+"\" target=\"_blank\">"+d.contacte.web+"</a>";
	}
	if(d.contacte.telefon != "") {
		con +="<br/>"+"<i class=\"fa fa-phone\"></i> &nbsp;" + d.contacte.telefon;
	}
	if(d.contacte.correu != "") {
		con +="<br/>"+"<i class=\"fa fa-envelope\"></i> &nbsp;" + d.contacte.correu; 
	}





	// Afegim la Descripcio
	con += "<p>"+d.descripcio+ "</p";

	// Afegir contacte (adreça, web...)
	
	
	//pintem el punt	
	
 	return L.marker(d.coordenades/*,{icon: greenIcon}*/).bindPopup(con);//.addTo(map);// borrar .addTo(map) per clusters
}

function tractaCoordenades(coordString) {
	// COmprovem primer el format de les coordenades i l'actualitzem amb les llibreries Geodesy
	if(/\d+°\d+'\d+\.\d+"(N|S) ?\d+°\d+'\d+\.\d+"(E|W) ?/.test(coordString)) {
		// fem la conversió
		var parts = coordString.split(/[^\d\w\.]+/);
		var lat = ConvertDMSToDD(parts[0], parts[1], parts[2], parts[3]);
    	var lng = ConvertDMSToDD(parts[4], parts[5], parts[6], parts[7]);

		return [lat, lng];
	} else {
		return [parseFloat(coordString.split(",")[0]), 
				parseFloat(coordString.split(",")[1])];
	}
}

function ConvertDMSToDD(degrees, minutes, seconds, direction) {
    var dd = Number(degrees) + Number(minutes)/60 + Number(seconds)/(60*60);

    if (direction == "S" || direction == "W") {
        dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
}

/*
 * Quan afegim un nou criteri de filtratge:
 */
function addCriteri(l, c) {
	let i = 0, n=exclos.length;
	//console.info("NOOOMS Altre cop:");
	//console.info(nomFiltrat);

	// Mirem a la llista d'exclosos si hi ha algun que compleix el nou criteri i el pintem i el movem al llistat d' actuals
		while (i < n) {
		if(exclos[i][l].indexOf(c) != -1) {
			cluster.addLayer(exclos[i].marker)
			actuals.push(exclos[i]);
			exclos.splice(i,1);
			--n
		} else {
			++i
		}
	}
	// console.info("Actuals!:");
	// console.info(actuals);
	// console.info("Exclosos!:");
	// console.info(exclos);

	//updateFiltreNom()
	map.addLayer(cluster);
	i = 0;

	// Incrementem el count als actuals que compleixen el criteri per saber en tot moment de quants criteris depen el punt pintat
	for(i; i < actuals.length; ++i) {
		if(actuals[i][l].indexOf(c) != -1) {
			++actuals[i].count;
		}
	}

}


/*
 * Quan esborrem un criteri de filtratge, es comprova:
 * 			1. Si el punt compleix el criteri
 * 			2. Si el punt no depenia de cap altre criteri
 * Si compleix tot es mou de la llista d'actuals a la de exclosos.
 * D'altra manera nomes es decrementa el contador del punt (count)
 * 
 */
function removeCriteri(l, c) {
	let i = 0, n=actuals.length;

	while (i < n) {
			if(actuals[i][l].indexOf(c) != -1 ) {
				
				
				--actuals[i].count;
				if(actuals[i].count == 0) {
					
					exclos.push(actuals[i]);
					cluster.removeLayer(actuals[i].marker);
					actuals.splice(i,1);
					--n
				}  else {
				++i
				}
			} else {
				++i;
			}
			
	}
	//updateFiltreNom()
	map.addLayer(cluster);
}


/*
 * Handling de les accions referents als criteris. 
 * Si no hi ha cap criteri seleccionat es pinten tots!
 */
function toggleCheckbox(c) {

	if (c.checked) {
		if(F==0) {
			let n=actuals.length
			for(i = 0; i <n; ++i) {

					cluster.removeLayer(actuals[0].marker);
					actuals[0].count=0;

					exclos.push(actuals[0]);
					actuals.splice(0,1);
					
			}
					map.addLayer(cluster);
					//updateFiltreNom()
		}
		++F
		
		addCriteri(c.name, c.value); 
		
		
	
	} else {
		--F;
		
		if (F==0) {

			let n = exclos.length;
			for(i = 0; i < n; i++) {

					cluster.addLayer(exclos[0].marker);
					actuals.push(exclos[0]);
					exclos.splice(0,1);
			}
			//updateFiltreNom()
			map.addLayer(cluster);
			
		} else {
			removeCriteri(c.name, c.value);
		}
	}	

	updateFiltreNom()

}

function getNom() {
	let s = document.getElementById("cerca").value;
	NOM = s;

	updateFiltreNom();
	

	
}

function updateFiltreNom() {

	
	 nomFiltrat = nomFiltrat.filter( function( el ) {
	 	return exclos.indexOf( el ) < 0;
	   } );
	 
	

	if(NOM.length>0) {
		
		var l = actuals;//.filter( function (el) { return nomFiltrat.indexOf( el ) < 0});
		
		let i = 0, n = l.length;
	
		while(i < n) {
			let e = l[i];
		
			if(e.nom.toLowerCase().indexOf(NOM.toLowerCase()) == -1 && e.nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").indexOf(NOM.toLowerCase()) == -1) {
				
				cluster.removeLayer(e.marker);
				if(!nomFiltrat.includes(e) ) {
			
					nomFiltrat.push(e);
				}
			} else {
				
				if(nomFiltrat.includes(e) ) {
					
				
					let i = nomFiltrat.indexOf(e);
					cluster.addLayer(e.marker);
					nomFiltrat.splice(i,1);
					--n;
					--i;
				}
			}
			++i;
		}
	
		

	} else {
		for(let i = 0; i < nomFiltrat.length; i++){
		
			 cluster.addLayer(nomFiltrat[i].marker);
		}
		nomFiltrat = [];
	}
	map.addLayer(cluster);

}

function mostraFiltres() {
	var div = document.getElementsByClassName('filtres')[0];
	if (!shown) {
		
		div.style= "visibility: visible; display: block;";
		++shown;
	} else {
		div.style= "visibility: hidden; display: none;";
		--shown;

	}
	// f.style = "visibility: visible;";
}


/*
 * Crea el div on es permetran les opcions de filtratge
 */
function creaDiv() {
	var logos = document.getElementById('logo');
	//logos.innerHTML = "<img class=\"fit\" src=\"img/logo_esplac_rgb.png\"> <img class=\"fit\" src=\"img/logo_casals.png\">";
	var f = document.getElementById('filter');
	var cont = "";
	var l = "<br/>";
	cont+= "<i class=\"fa fa-search\"> </i> <input type=\"text\" id=\"cerca\" placeholder=\"Cerca pel nom de l'entitat\" oninput=\"getNom()\"" +l+l;
	cont+= l+"<span style=\"cursor:pointer\" class=\"filterButton\" onclick=\"mostraFiltres()\"><i class=\"fa fa-filter\"></i> Filtra </span>"+l;
	cont+="<div class=\"filtres\" >"+l+"<b> Diverstitats </b>"+l;
	for(i = 0; i < filtres.diversitats.length; ++i) {
		var nom = filtres.diversitats[i];
		cont+="<input type=\"checkbox\" name=\"ambits\" value=\""+nom+"\"onchange=\"toggleCheckbox(this)\" >"+nom+l;
	}
	cont+="<b> Etiquetes </b>"+l;
	for(i = 0; i < filtres.tags.length; ++i) {
		var nom = filtres.tags[i];
		cont+="<input type=\"checkbox\" name=\"etiquetes\" value=\""+nom+"\" onchange=\"toggleCheckbox(this)\" >"+nom+l;
	}
	cont+="<b> Qué pot oferir? </b>"+l;
	for(i = 0; i < filtres.oferta.length; ++i) {
		var nom = filtres.oferta[i];
		cont+="<input type=\"checkbox\" name=\"oferir\" value=\""+nom+"\" onchange=\"toggleCheckbox(this)\" >"+nom+l;
	}

//	cont+="<b>Sectors </b>"+l;
//	for(i = 0; i < filtres.sectors.length; ++i) {
//		var nom = filtres.sectors[i];
//		cont+="<input type=\"checkbox\" name=\"sector\" value=\""+nom+"\" onchange=\"toggleCheckbox(this)\" >"+nom+l;
//
//	}
	cont += "</div>"
	// Enllaç formulari
	cont += "<p>Si vols aparèixer al mapa, omple <a href=\"https://infoesplac.typeform.com/to/fPFOZ0\" target=\"_blank\">aquest formulari</a>!</p>"
	f.innerHTML = cont;
	f.style = "visibility: visible;";
}

/*
 * Setter dels filtres
 */
function setFiltres(d,t,o,s){
	filtres.diversitats=d;
	filtres.tags=t;
	filtres.oferta=o;
	filtres.sectors=s;
	
}

// Entrypoint
function afegirPunts(dades) {

	for(var i =0; i<dades.length; ++i) {			
		let d = dades[i];
		if(d.coordenades == "") continue;
		m = pintaPunt(d);
		d.marker = m;
		cluster.addLayer(m);
		actuals.push(d)
	}
	map.addLayer(cluster); 
	creaDiv();
}
