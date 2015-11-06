'use strict';

class ExtendedMindPublicItems {

  // Constructor

  constructor(itemsResponse){
    this.owner = itemsResponse.owner;
    this.modified = itemsResponse.modified;
    this._addItems(itemsResponse.notes, itemsResponse.tags, itemsResponse.unpublished);
  }

  // Public



  // Private

  _addItems(notes, tags, unpublished){

    let staleKeywords = [];
    if (tags){
      for (let i=0; i<tags.length; i++){
        _updateTag(tags[i]);
      }
    }
    if (notes){
      for (let i=0; i<notes.length; i++){
        let staleKeywordsInNote = _updateNote(_addTagsToNote(notes[i]));
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

    _pruneMissingKeywords(staleKeywords);
  }

  _addTagsToNote(notes){
    if (note.relationships && note.relationships.tags && tags){
      note.keywords = [];
      for (let i=0; i<note.relationships.tags; i++){
        for (let j=0; j<this.tags.length; j++){
          if (this.tags[j].uuid === note.relationships.tags[i].uuid){
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
    if (!this.notes) this.notes = {};
    for (let i=0; i<this.notes.length; i++){
      if (this.notes[i].uuid === note.uuid){
        // Replace value with new value
        if (note.deleted){
          let oldKeywords = notes[i].keywords;
          let newKeywords = note.keywords;
          notes[i] = note;
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
    if (!this.tags) this.tags = {};
    for (let i=0; i<this.tags.length; i++){
      if (this.tags[i].uuid === tag.uuid){
        tags[i] = tag;
        return tags[i];
      }
    }
    this.tags.push(tag);
    return tag;
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
