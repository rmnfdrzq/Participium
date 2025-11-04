"use strict";

export function Player(id, username, password, mail, coins) {
  this.id = id;
  this.username = username;
  this.password = password;
  this.mail = mail;
  this.coins = coins;
}

export function Letter(id, char, cost) {
  this.id = id;
  this.char = char.toUpperCase();
  this.cost = cost;

  this.enough = (coinsAmount) => coinsAmount >= this.cost;
}

export function SimpleLett(value, final) {
  this.value = value.toUpperCase();
  this.final = final;
}

export function Game(id, playerId, phraseTot, phrasePartial ,timer, state) {
  this.id = id;
  this.playerId = playerId;
  this.phraseTot = phraseTot;
  this.phrasePartial = phrasePartial;
  this.timer = timer;
  this.state = state;
}

//final=true: se vuoi cambiare i final, quindi se origina dalla phrasepartial del db
//final verranno messi lì dove la partial non avrà spazi
export function stringToLettersArray(str,final) {
  return str.split("*").map(
    (word) => Array.from(word).map((char) => new SimpleLett(char, final && char !== " "))
  );
}

// genera la prima versione di phrasePartial hidden nel db se firstTime=true
// altrimenti genera phrasePartial finale a chiusura partita con tutti i caratteri
export function generatePartial(phrase,firstTime) {
  
  return Array.from(phrase).map((ch) => {
    if (/[A-Za-z]/.test(ch) && firstTime) {
      return " "; // lettere sostituite con spazio
    } else {
      return ch.toUpperCase(); // punteggiatura invariata
    }
  }).join(""); //ricostruisce stringa
}

// Normalizza una frase tot a inizio partita
export function normalizeSpaces(phrase) {
  return phrase
    .trim()                 // toglie spazi a inizio/fine
    .replace(/\s+/g, "*");  // toglie /\s (gli spazi,tab e newline) + (più occorrenze) g (non si ferma alla prima occorrenza)
}