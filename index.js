// ==UserScript==
// @name         Discord Status Remote Control
// @namespace    https://discord.com/
// @version      0.1.1
// @description  Toggle Discord online status without entering the app first
// @author       d0gkiller87
// @match        https://discord.com/*
// @exclude      https://discord.com/channels/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discord.com
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @license      MIT
// ==/UserScript==

import { PreloadedUserSettings } from "discord-protos/src/index";

GM_addStyle(`
  #status-selector {
    position: fixed;
    bottom: 20px;
    left: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    z-index: 9999;
  }
  #status-selector button {
    background: none;
    border: 1px solid white;
    color: white;
    padding: 8px;
    cursor: pointer;
  }
  #status-selector button.online {
    background-color: #43a25a;
  }
  #status-selector button.idle {
    background-color: #ca9654;
  }
  #status-selector button.dnd {
    background-color: #d83a42;
  }
  #status-selector button.invisible {
    background-color: #83838b;
  }
`);

(async () => {
  class StatusMenu {
    constructor( discordToken ) {
      this.discordToken = discordToken;
      this.statusSelector = null;
      this.buttons = {};
    }

    async init() {
      // Create a UI element for the status options
      this.statusSelector = document.createElement( 'div' );
      this.statusSelector.id = 'status-selector';
      document.body.appendChild( this.statusSelector );

      // Fetch current status and display it
      const currentStatus = ( await this.fetchCurrentUserSettings() ).status.status.value;

      // Add buttons to change status
      [ 'online', 'idle', 'dnd', 'invisible' ].forEach(
        status => {
          const button = document.createElement( 'button' );
          button.textContent = status.charAt(0).toUpperCase() + status.slice(1);
          button.classList.toggle( status, status === currentStatus );
          button.onclick = async () => {
            const newUserSettings = await this.fetchCurrentUserSettings();
            newUserSettings.status.status.value = status;
            await this.setUserSettings( newUserSettings );
            await this.refreshStatus( status );
          }
          this.statusSelector.appendChild( button );
          this.buttons[status] = button;
        }
      );
    }

    async refreshStatus( currentStatus = null ) {
      if ( !currentStatus ) {
        currentStatus = ( await this.fetchCurrentUserSettings() ).status.status.value;
      }
      for ( const [ status, button ] of Object.entries( this.buttons ) ) {
        button.classList.toggle( status, status === currentStatus );
      }
    }

    async fetchCurrentUserSettings() {
      const response = await fetch( 'https://discord.com/api/v9/users/@me/settings-proto/1', {
        headers: {
          "Authorization": this.discordToken
        }
      });
      const data = await response.json();
      const decoded = PreloadedUserSettings.fromBase64( data.settings );
      return decoded;
    }

    async setUserSettings( userSettings ) {
      const encoded = PreloadedUserSettings.toBase64( userSettings );

      await fetch( 'https://discord.com/api/v9/users/@me/settings-proto/1', {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": this.discordToken
        },
        body: JSON.stringify({ settings: encoded })
      });
    }
  }

  const token = JSON.parse( window.localStorage.getItem( 'token' ) );

  // Check if user is logged in via cookie
  if ( !token ) {
    console.warn( 'You need to be signed in to Discord to change your status.' );
    return;
  }

  await new Promise(( resolve ) => {
    if ( document.readyState === 'complete' ) {
      resolve(); // The page is already loaded
    } else {
      window.addEventListener( 'load', resolve ); // Wait for the load event
    }
  });

  const menu = new StatusMenu( token );
  await menu.init();
})();
