    #include <stdio.h>
    #include <stdlib.h>
    #include <string.h>
    
    #define STACK_SIZE 256
    
    typedef struct {
        long data[STACK_SIZE];
        int top;
    } Stack;
    
    void push(Stack *s, long val) {
        if (s->top < STACK_SIZE) s->data[++(s->top)] = val;
    }
    
    long pop(Stack *s) {
        if (s->top >= 0) return s->data[(s->top)--];
        return 0;
    }
    
    int main() {
        Stack aether_stack = {.top = -1};
        printf("Nexorian Aether VM Initialized.\n");
        // VM Loop to process Aether Words will be implemented here.
        return 0;
    }
    

