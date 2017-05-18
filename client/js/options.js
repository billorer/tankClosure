var getKeyCode = function(event, inputID){
    var x = event.which || event.keyCode;

    switch(x) {
            case 37: // left
                document.getElementById("input"+inputID).value = "Left Arrow";
            break;
            case 38: // up
                document.getElementById("input"+inputID).value = "Up Arrow";
            break;
            case 39: // right
                document.getElementById("input"+inputID).value = "Right Arrow";
            break;
            case 40: // down
                document.getElementById("input"+inputID).value = "Down Arrow";
            break;
            default:
                // X from charCode -> 65 -> Aa az eredmeny, ebbol veszem a masodik karaktert a-t
                document.getElementById("input"+inputID).value = String.fromCharCode(x).charAt(1);
            break;
        }
    document.getElementById("input"+inputID).placeholder = x;
    console.log("Code: " + x);
};


var getMouseCode = function(event, inputID){
    var x = event.which || event.keyCode;

    switch(x) {
        case 1:
            document.getElementById("input"+inputID).value = "Left Mouse Button";
        break;
        case 2:
            document.getElementById("input"+inputID).value = "Right Mouse Button";
        break;
    }
    document.getElementById("input"+inputID).placeholder = x;
    console.log("Code: " + x);
};


// this function changes the value of the input fields before they can be submitted, their value will be a number!
var beforeSubmit = function(){
    //alert("TEXT: " + document.getElementById("inputForward").placeholder);

    document.getElementById("inputForward").value = document.getElementById("inputForward").placeholder;
    document.getElementById("inputBackward").value = document.getElementById("inputBackward").placeholder;
    document.getElementById("inputLeft").value = document.getElementById("inputLeft").placeholder;
    document.getElementById("inputRight").value = document.getElementById("inputRight").placeholder;

    document.getElementById("inputAttack").value = document.getElementById("inputAttack").placeholder;
};
