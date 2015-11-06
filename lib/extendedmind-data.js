'use strict';

class ExtendedMindPublicItems {

  // Constructor

  constructor(itemsResponse){
    this.owner = itemsResponse.owner;
    this.modified = itemsResponse.modified;
    this._addItems(itemsResponse.notes, itemsResponse.tags);
  }

  // Public



  // Private

  _addItems(notes, tags){
    if (tags){
      for (let i=0; i<tags.length; i++){
        _updateTag(tags[i]);
      }
    }
    if (notes){
      for (let i=0; i<notes.length; i++){
        _updateNote(_addTagsToNote(notes[i], tags));
      }
    }
  }

  _addTagsToNote(note, tags){
    if (note.relationships && note.relationships.tags && tags){
      note.keywords = [];
      for (let i=0; i<note.relationships.tags; i++){
        for (let j=0; j<tags.length; j++){
          if (tags[j].uuid === note.relationships.tags[i].uuid){
            note.keywords.push(tags[j]);
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
        if (note.deleted)
        notes[i] = note;
        return notes[i];
      }
    }
    if (!note.deleted) this.notes.push(note);
    return note;
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

}
module.exports = ExtendedMindPublicItems;
