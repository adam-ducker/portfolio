class QuotesController < ApplicationController
    def index
        @quotes = Quote.all
        render json: @quotes
    end

    def show
        begin
            @quote = Quote.find(params[:id])
            render json: @quote
        rescue ActiveRecord::RecordNotFound
            render :json => "Quote not found"
        end
    end

    def create
        @quote = Quote.new(quote_params)
        if @quote.save
            render json: @quote, status: :created
        else
            render json: @quote.errors, status: :unprocessable_entity
        end
    end

private

    def quote_params
        params.expect(quote: [:by, :content])
    end
end
