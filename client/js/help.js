var openUploadForm = function() {
    if(document.getElementById('uploadForm').style.display == 'block'){
        document.getElementById('uploadForm').style.display = 'none';
    }else{
        document.getElementById('uploadForm').style.display = 'block';
    }
}

var warning = function() {
    var popup = document.getElementById("myPopup");
    popup.classList.toggle("show");
}
