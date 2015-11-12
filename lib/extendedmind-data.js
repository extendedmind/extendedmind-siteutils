'use strict';

class ExtendedMindPublicItems {

  // Constructor

  constructor(itemsResponse){
    this.owner = itemsResponse.owner;
    this.format = itemsResponse.format;
    this.content = itemsResponse.content;
    this._updateLatestModified(itemsResponse.modified);
    this._addItems(itemsResponse.notes, itemsResponse.tags, itemsResponse.unpublished);
    this.synced = Date.now();
  }

  // Public

  getLatestModified(){
    return this.modified;
  }

  getLastSynced(){
    return this.synced;
  }

  updateItems(itemsResponse){
    if (itemsResponse.modified) this._updateLatestModified(itemsResponse.modified);
    if (itemsResponse.owner) this.owner = itemsResponse.owner;
    if (itemsResponse.format) this.format = itemsResponse.format;
    if (itemsResponse.content) this.content = itemsResponse.content;
    this._addItems(itemsResponse.notes, itemsResponse.tags, itemsResponse.unpublished);
  }

  getNotes(filters){
    if (filters && filters.length && this.notes.length){
      // Start with a full copy of the notes array
      let filteredNotes = this.notes.slice();
      for (let i=0; i<filters.length; i++){
        if (filters[i].type === 'index'){
          if (filters[i].start > this.notes.length-1 || filters[i].max === 0){
            // The index is bigger than the size of the array, or only zero notes are requested,
            // just return an empty array
            return [];
          }else{
            let endIndex = filters[i].max ? filters[i].start + filters[i].max : undefined;
            filteredNotes = filteredNotes.slice(filters[i].start, endIndex);
          }
        }else if (filters[i].type === 'keyword'){
          if (filters[i].include){
            // Only include notes with the given keyword
            for (let j=filteredNotes.length-1; j>=0; j--){
              let keywordFound = false;
              if (filteredNotes[j].keywords && filteredNotes[j].keywords.length){
                for (let k=0; k<filteredNotes[j].keywords.length; k++){
                  if (filteredNotes[j].keywords[k].title === filters[i].include){
                    keywordFound = true;
                    break;
                  }else if (filteredNotes[j].keywords[k].parent){
                    // The tag has a parent, see if the include filter hits that
                    let parentTag = this._getTagByUUID(filteredNotes[j].keywords[k].parent);
                    if (parentTag && parentTag.title === filters[i].include){
                      keywordFound = true;
                    }
                  }
                }
              }
              if (!keywordFound) filteredNotes.splice(j, 1);
            }
          }
        }
      }
      return filteredNotes;
    }else{
      return this.notes;
    }
  }

  getNote(path){
    if (this.notes && this.notes.length){
      for (let i=0; i<this.notes.length; i++){
        if (this.notes[i].visibility.path === path)
          return this.notes[i];
      }
    }
  }

  // Private

  _updateLatestModified(modified){
    if (modified && (!this.modified || this.modified < modified)) this.modified = modified;
  }

  _addItems(notes, tags, unpublished){

    let staleKeywords = [];
    if (tags){
      for (let i=0; i<tags.length; i++){
        this._updateTag(tags[i]);
      }
    }
    if (notes){
      for (let i=0; i<notes.length; i++){
        let staleKeywordsInNote = this._updateNote(this._addTagsToNote(notes[i]));
        if (staleKeywordsInNote) staleKeywords.push(...staleKeywordsInNote);
      }
    }
    if (unpublished && this.notes){
      for (let i=this.notes.length-1; i>=this.notes.length; i--){
        if (unpublished.indexOf[this.notes[i]] !== -1){
          if (this.notes[i].keywords) staleKeywords.push(...this.notes[i].keywords);
          this.notes.splice(i,1);
        }
      }
    }

    // Sort notes in descending order based on the published timestamp
    if (this.notes && this.notes.length > 1){
      this.notes.sort(function(note1, note2){
        return note2.visibility.published - note1.visibility.published;
      })
    }

    // Prune keywords that might be unneeded
    this._pruneMissingKeywords(staleKeywords);
  }

  _addTagsToNote(note){
    if (note.relationships && note.relationships.tags){
      note.keywords = [];
      for (let i=0; i<note.relationships.tags.length; i++){
        for (let j=0; j<this.tags.length; j++){
          if (this.tags[j].uuid === note.relationships.tags[i]){
            note.keywords.push(this.tags[j]);
            break;
          }
        }
      }
      delete note.relationships;
    }
    return note;
  }

  _updateNote(note){
    if (!this.notes) this.notes = [];
    this._updateLatestModified(note.modified);
    for (let i=0; i<this.notes.length; i++){
      if (this.notes[i].uuid === note.uuid){
        // Replace value with new value
        if (note.deleted){
          let oldKeywords = this.notes[i].keywords;
          let newKeywords = note.keywords;
          this.notes[i] = note;
          if (newKeywords && oldKeywords){
            // Return those keywords that might no longer be needed
            return oldKeywords.filter((oldKeyword) => {
              return newKeywords.indexOf(oldKeyword) < 0;
            });
          }
        }
      }
    }
    if (!note.deleted) this.notes.push(note);
  }

  _updateTag(tag){
    if (!this.tags) this.tags = [];
    this._updateLatestModified(tag.modified);
    for (let i=0; i<this.tags.length; i++){
      if (this.tags[i].uuid === tag.uuid){
        this.tags[i] = tag;
        return this.tags[i];
      }
    }
    this.tags.push(tag);
    return tag;
  }

  _getTagByUUID(uuid){
    if (this.tags){
      for (let i=0; i<this.tags.length; i++){
        if (this.tags[i].uuid === uuid){
          return this.tags[i];
        }
      }
    }
  }

  _pruneMissingKeywords(staleKeywords){
    if (staleKeywords.length){
      for (let i=0; j<staleKeywords.length; i++){
        let keywordInUse = false;
        for (let j=0; j<this.notes.length; j++){
          if (this.notes[j].keywords.contains(staleKeywords[i])){
            keywordInUse = true;
            break;
          }
        }
        if (!keywordInUse){
          let keywordIndex = this.tags.indexOf(staleKeywords[i]);
          if (keywordIndex !== -1){
            this.tags.splice(keywordIndex, 1);
          }
        }
      }
    }
  }

}
module.exports = ExtendedMindPublicItems;
